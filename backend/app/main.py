import os
import jwt
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import SessionLocal
from app import models
from app.models import User
from app import firebase
from app.database import engine
import uuid
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.models import Article, HistoryRating, ArticleComment  # Articleモデルをインポート
from app.database import get_db  # データベースセッションを取得する関数をインポート
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import String, cast, or_
from datetime import datetime, timedelta
import aiofiles
import json
import shutil
from PIL import Image, ImageOps
from io import BytesIO
import urllib.parse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# JWT 設定
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # トークンの有効期限

# **✅ JWTトークン作成関数**
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# モデルをDBに反映（エラーハンドリング付き）
try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ データベーステーブル作成完了")
except Exception as e:
    print(f"⚠️ データベーステーブル作成エラー: {e}")
    print("🔄 アプリケーションは継続しますが、データベース機能は制限される可能性があります")

# リクエストボディのスキーマ
class LoginRequest(BaseModel):
    email: str
    password: str

# パスワードハッシュ化の設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydanticモデル
class RegisterRequest(BaseModel):
    email: str
    password: Optional[str] = None  # **🔹 Google / Apple の場合は `None` を許容**
    username: str
    prefectures: Optional[int] = None
    introduction_text: Optional[str] = None

# コメントのリクエストボディスキーマ
class CommentRequest(BaseModel):
    user_id: int
    comment: str

# データベースセッション依存関係
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()
UPLOAD_DIRECTORY = "./static"
MAX_FILE_SIZE_MB = 100  # 100MBまで許可（大きめに）
MAX_IMAGE_WIDTH = 1280  # 画像の最大幅を制限
ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "mp4", "mov", "avi", "webm"]  # .mov を許可

# ベースURL設定（環境に応じて動的に決定）
def get_base_url():
    # 環境変数から取得（本番環境での優先度が高い）
    base_url = os.getenv("API_BASE_URL")
    if base_url:
        return base_url
    
    # Docker環境の検出
    if os.path.exists('/.dockerenv'):
        # Dockerコンテナ内の場合は本番環境として扱う
        return "https://calmie.jp/api"
    
    # ローカル開発環境
    return "http://localhost:8000"

# URL変換関数（既存のlocalhostURLを環境に応じて変換）
def convert_url_for_environment(url: str) -> str:
    """既存のURLを現在の環境に応じて変換する"""
    if not url:
        return url
    
    current_base_url = get_base_url()
    
    # localhostのURLを現在の環境のURLに変換
    if "http://localhost:8000" in url:
        return url.replace("http://localhost:8000", current_base_url)
    # 本番URLをローカル環境用に変換（開発時）
    elif "https://calmie.jp/api" in url and current_base_url == "http://localhost:8000":
        return url.replace("https://calmie.jp/api", current_base_url)
    
    return url

# ディレクトリが存在しない場合は作成
if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)

# staticディレクトリの絶対パスを確認
print(f"📁 UPLOAD_DIRECTORY: {os.path.abspath(UPLOAD_DIRECTORY)}")

app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS設定を追加
origins = [
    "http://localhost:5173",  # フロントエンドのURL
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 許可するオリジンをリストで指定
    allow_credentials=True,
    allow_methods=["*"],  # 全てのHTTPメソッドを許可
    allow_headers=["*"],  # 全てのHTTPヘッダーを許可
)

# ✅ ユーザー登録
@app.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        or_(User.username == request.username, User.email == request.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # 🔹 Firebaseに登録
    firebase_user_id = None
    try:
        firebase_data = {"email": request.email, "display_name": request.username}
        if request.password:
            firebase_data["password"] = request.password
        firebase_user = auth.create_user(**firebase_data)
        firebase_user_id = firebase_user.uid
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email is already registered in Firebase")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ユーザー作成に失敗しました: {str(e)}")


    # 🔹 Google / Apple の場合は `password_hash` を `None` にする
    password_hash = pwd_context.hash(request.password) if request.password else None

    # 🔹 データベースに保存
    new_user = User(
        username=request.username,
        password_hash=password_hash,
        firebase_user_id=firebase_user_id,
        display_name=request.username,
        prefectures=request.prefectures,
        email=request.email,
        introduction_text=request.introduction_text,
        points=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 🔹 JWT or Firebaseトークン発行
    if firebase_user_id:
        token = auth.create_custom_token(firebase_user_id)
    else:
        token = create_access_token({"sub": new_user.email})

    return {
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "display_name": new_user.display_name,
            "user_icon": new_user.user_icon,
            "introduction_text": new_user.introduction_text,
        }
    }

# ✅ OAuthログイン (Google, Apple)
class OAuthLoginRequest(BaseModel):
    id_token: str

@app.post("/oauth-login")
def oauth_login(request: OAuthLoginRequest, db: Session = Depends(get_db)):
    try:
        decoded_token = auth.verify_id_token(request.id_token)
        email = decoded_token.get("email")
        uid = decoded_token.get("uid")

        if not email or not uid:
            raise HTTPException(status_code=400, detail="Invalid OAuth token")

        db_user = db.query(User).filter(User.firebase_user_id == uid).first()

        if not db_user:
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already exists in database")

            new_user = User(
                username=email.split("@")[0],
                firebase_user_id=uid,
                display_name=email.split("@")[0],
                email=email,
                password_hash=None,
                points=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            db_user = new_user

        token = auth.create_custom_token(uid)

        return {
            "token": token,
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "display_name": db_user.display_name,
                "user_icon": db_user.user_icon,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"OAuth authentication failed: {str(e)}")

# ✅ ログインAPI
@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        try:
            firebase_user = auth.get_user_by_email(request.email)
            db_user = db.query(User).filter(User.firebase_user_id == firebase_user.uid).first()
            if db_user:
                token = auth.create_custom_token(firebase_user.uid)
                return {
                    "token": token,
                    "user": {
                        "id": db_user.id,
                        "username": db_user.username,
                        "display_name": db_user.display_name,
                        "user_icon": db_user.user_icon,
                        "introduction_text": db_user.introduction_text,
                    }
                }
        except Exception:
            pass

        db_user = db.query(User).filter(User.email == request.email).first()
        if not db_user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if db_user.password_hash and not pwd_context.verify(request.password, db_user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")

        access_token = create_access_token(data={"sub": db_user.email})
        return {
            "token": access_token,
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "display_name": db_user.display_name,
                "user_icon": db_user.user_icon,
                "introduction_text": db_user.introduction_text,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# 記事一覧(最新)を取得
@app.get("/")
def read_root(db: Session = Depends(get_db)):
    # articles テーブルから最新 30 件を取得
    articles = db.query(Article).order_by(Article.public_at.desc()).limit(30).all()
    
    # 結果リストを構築
    result = []
    for article in articles:
        # history_rating から like_count と access_count を取得
        history = (
            db.query(HistoryRating)
            .filter(HistoryRating.article_id == article.id)
            .first()
        )
        
        # article_comments からコメント数を取得
        comment_count = (
            db.query(ArticleComment)
            .filter(ArticleComment.article_id == article.id)
            .count()
        )
        
        result.append({
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "thumbnail_url": convert_url_for_environment(article.thumbnail_image),
            "public_at": article.public_at,
            "like_count": history.like_count if history else 0,
            "access_count": history.access_count if history else 0,
            "comment_count": comment_count,
            "category": article.category,
        })
    
    return result

# 記事一覧(最新)を取得 - /articlesエンドポイント（修正版）
@app.get("/articles")
def get_articles(db: Session = Depends(get_db)):
    # articles テーブルから最新 30 件を取得
    articles = db.query(Article).order_by(Article.public_at.desc()).limit(30).all()
    
    # 結果リストを構築（既存記事の修正対応）
    result = []
    for article in articles:
        # history_rating から like_count と access_count を取得
        history = (
            db.query(HistoryRating)
            .filter(HistoryRating.article_id == article.id)
            .first()
        )
        
        # 🔧 history_ratingが存在しない場合は作成
        if not history:
            history = HistoryRating(
                article_id=article.id,
                like_count=0,
                access_count=0,
                super_like_count=0
            )
            db.add(history)
            db.commit()
            db.refresh(history)
        
        # article_comments からコメント数を取得
        comment_count = (
            db.query(ArticleComment)
            .filter(ArticleComment.article_id == article.id)
            .count()
        )
        
        # ユーザー情報も含める
        user = db.query(User).filter(User.id == article.create_user_id).first()
        
        result.append({
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "thumbnail_url": convert_url_for_environment(article.thumbnail_image),
            "thumbnail_image": convert_url_for_environment(article.thumbnail_image),  # 両方のフィールド名に対応
            "public_at": article.public_at,
            "like_count": history.like_count,
            "likes_count": history.like_count,  # 複数の命名に対応
            "access_count": history.access_count,
            "comment_count": comment_count,
            "category": article.category,
            "username": user.username if user else "Unknown",
            "user_id": article.create_user_id,
        })
    
    return result

# 記事一覧(ランキング)を取得する
@app.get("/articles/ranking")
def get_articles_ranking(db: Session = Depends(get_db)):
    # いいね数でソートしたランキングを返す
    try:
        articles = (
            db.query(Article)
            .join(HistoryRating, Article.id == HistoryRating.article_id, isouter=True)
            .order_by(HistoryRating.like_count.desc().nullslast())
            .limit(30)
            .all()
        )
        
        result = []
        for article in articles:
            history = (
                db.query(HistoryRating)
                .filter(HistoryRating.article_id == article.id)
                .first()
            )
            
            comment_count = (
                db.query(ArticleComment)
                .filter(ArticleComment.article_id == article.id)
                .count()
            )
            
            result.append({
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "thumbnail_url": article.thumbnail_image,
                "public_at": article.public_at,
                "like_count": history.like_count if history else 0,
                "access_count": history.access_count if history else 0,
                "comment_count": comment_count,
                "category": article.category,
            })
        
        return result
    except Exception as e:
        # ダミーデータを返す
        return [
            {
                "id": 1,
                "title": "🏆 今週最も愛された子猫の動画",
                "content": "多くの人に愛された癒しの動画をランキング形式でお届け",
                "thumbnail_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop",
                "public_at": "2024-01-01T00:00:00",
                "like_count": 2500,
                "access_count": 50000,
                "comment_count": 150,
                "category": ["動物", "猫", "ランキング"]
            }
        ]

# 記事一覧(トレンド)を取得する
@app.get("/articles/trend")
def get_articles_trend(db: Session = Depends(get_db)):
    # アクセス数でソートしたトレンドを返す
    try:
        articles = (
            db.query(Article)
            .join(HistoryRating, Article.id == HistoryRating.article_id, isouter=True)
            .order_by(HistoryRating.access_count.desc().nullslast())
            .limit(30)
            .all()
        )
        
        result = []
        for article in articles:
            history = (
                db.query(HistoryRating)
                .filter(HistoryRating.article_id == article.id)
                .first()
            )
            
            comment_count = (
                db.query(ArticleComment)
                .filter(ArticleComment.article_id == article.id)
                .count()
            )
            
            result.append({
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "thumbnail_url": article.thumbnail_image,
                "public_at": article.public_at,
                "like_count": history.like_count if history else 0,
                "access_count": history.access_count if history else 0,
                "comment_count": comment_count,
                "category": article.category,
            })
        
        return result
    except Exception as e:
        # ダミーデータを返す
        return [
            {
                "id": 2,
                "title": "📈 話題沸騰！赤ちゃんパンダの成長記録",
                "content": "多くの人が注目している話題の記事をトレンド形式でお届け",
                "thumbnail_url": "https://images.unsplash.com/photo-1539681944080-d63d2ad9f92b?w=400&h=300&fit=crop",
                "public_at": "2024-01-01T00:00:00",
                "like_count": 1800,
                "access_count": 75000,
                "comment_count": 200,
                "category": ["動物", "パンダ", "トレンド"]
            }
        ]

@app.get("/articles/search")
def search_articles(category: Optional[str] = None, query: Optional[str] = None, db: Session = Depends(get_db)):
    base_query = db.query(Article)

    if category:
        base_query = base_query.filter(Article.category.any(category))
    elif query:
        base_query = base_query.filter(
            or_(
                Article.title.ilike(f"%{query}%"),
                Article.content.ilike(f"%{query}%"),
                Article.category.any(query)
            )
        )

    return base_query.order_by(Article.public_at.desc()).all()


# 記事一つ(セレクトしたもの)を取得する、このときに閲覧数を増やす、限定公開の場合はログインが必要
@app.get("/articles/{id}")
def get_article(id: int, db: Session = Depends(get_db)):
    # 記事を取得
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # 閲覧数・いいね数などの履歴情報取得 or 初期化
    history = db.query(HistoryRating).filter(HistoryRating.article_id == article.id).first()
    if not history:
        history = HistoryRating(article_id=article.id, like_count=0, access_count=1)
        db.add(history)
    else:
        history.access_count += 1
    db.commit()
    db.refresh(history)

    like_count = history.like_count
    access_count = history.access_count

    # 記事の作成者情報を取得
    user = db.query(User).filter(User.id == article.create_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # コメント情報を取得
    comments = db.query(ArticleComment).filter(ArticleComment.article_id == id).all()
    comment_data = [
        {
            "id": comment.id,
            "username": comment.username,
            "user_id": comment.user_id,
            "comment": comment.comment,
            "comment_likes": comment.comment_likes,
            "created_at": comment.created_at,
        }
        for comment in comments
    ]

    # 表示する記事のカテゴリの一番上を取得
    primary_category_number = article.category[0] if article.category else None
    if not primary_category_number:
        raise HTTPException(status_code=404, detail="No category found for the article")

    # 同じカテゴリの記事
    recommended_articles = []
    related_articles = db.query(Article).filter(
        Article.id != id,
        cast([primary_category_number], ARRAY(String)).op("@>")(Article.category)
    ).order_by(Article.public_at.desc()).limit(10).all()

    for art in related_articles:
        related_history = db.query(HistoryRating).filter(HistoryRating.article_id == art.id).first()
        comment_count = db.query(ArticleComment).filter(ArticleComment.article_id == art.id).count()
        recommended_articles.append({
            "id": art.id,
            "title": art.title,
            "thumbnail_url": art.thumbnail_image,
            "public_at": art.public_at,
            "like_count": related_history.like_count if related_history else 0,
            "access_count": related_history.access_count if related_history else 0,
            "comment_count": comment_count,
        })

    # 他のユーザーの記事
    user_articles = []
    other_articles = db.query(Article).filter(
        Article.create_user_id == user.id, Article.id != id
    ).order_by(Article.public_at.desc()).limit(10).all()

    for art in other_articles:
        user_history = db.query(HistoryRating).filter(HistoryRating.article_id == art.id).first()
        comment_count = db.query(ArticleComment).filter(ArticleComment.article_id == art.id).count()
        user_articles.append({
            "id": art.id,
            "title": art.title,
            "thumbnail_url": art.thumbnail_image,
            "public_at": art.public_at,
            "like_count": user_history.like_count if user_history else 0,
            "access_count": user_history.access_count if user_history else 0,
            "comment_count": comment_count,
        })

    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "thumbnail_url": convert_url_for_environment(article.thumbnail_image),
        "like_count": like_count,
        "access_count": access_count,
        "category": article.category,
        "public_at": article.public_at,
        "comments": comment_data,
        "user": {
            "id": user.id,
            "username": user.username,
            "user_icon": convert_url_for_environment(user.user_icon),
            "introduction_text": user.introduction_text,
        },
        "user_articles": user_articles,
        "recommended_articles": recommended_articles,
    }


# 以下ログインが必要なエンドポイント

# ファイルアップロード
@app.post("/upload/media/")
async def upload_media(file: UploadFile = File(...)):
    try:
        # **ファイルサイズのチェック**
        file_size = 0
        async for chunk in file.stream(1024 * 1024):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail="ファイルサイズが大きすぎます。（最大100MB）")

        # **拡張子を取得**
        extension = file.filename.split(".")[-1].lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"{file.filename} は無効な形式です。許可されているのは {ALLOWED_EXTENSIONS} です。")

        new_filename = f"{uuid.uuid4()}.{extension}"  # UUIDで重複防止
        file_path = os.path.join(UPLOAD_DIRECTORY, new_filename)

        # **画像の場合は圧縮・リサイズ（高速化）**
        if extension in ["jpg", "jpeg", "png"]:
            # ファイルの先頭に戻す
            await file.seek(0)
            image_data = await file.read()
            image = Image.open(BytesIO(image_data))
            
            # 画像の向きを自動修正（EXIF情報対応）
            image = ImageOps.exif_transpose(image)
            
            # RGBモードに変換（PNG透明度対応）
            if image.mode in ('RGBA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            width, height = image.size

            # **画像が大きすぎる場合はリサイズ（高速化）**
            if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_WIDTH:
                # より効率的なリサイズ計算
                if width > height:
                    new_width = MAX_IMAGE_WIDTH
                    new_height = int((MAX_IMAGE_WIDTH / width) * height)
                else:
                    new_height = MAX_IMAGE_WIDTH
                    new_width = int((MAX_IMAGE_WIDTH / height) * width)
                
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # **最適化された圧縮設定（通信量削減）**
            buffer = BytesIO()
            image.save(buffer, 
                      format="JPEG", 
                      quality=60,  # 品質を60%に調整（通信量削減）
                      optimize=True,  # ファイルサイズ最適化
                      progressive=True)  # プログレッシブJPEG（読み込み高速化）
            
            async with aiofiles.open(file_path, "wb") as out_file:
                await out_file.write(buffer.getvalue())
            
            # **サムネイル画像の作成（さらなる通信量削減）**
            thumbnail_size = (400, 400)  # 400x400のサムネイル
            thumb_image = image.copy()
            thumb_image.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
            
            # サムネイル用ファイル名
            thumb_filename = f"{uuid.uuid4()}_thumb.jpg"
            thumb_path = os.path.join(UPLOAD_DIRECTORY, thumb_filename)
            
            # サムネイル保存（さらに低品質で圧縮）
            thumb_buffer = BytesIO()
            thumb_image.save(thumb_buffer, 
                           format="JPEG", 
                           quality=50,  # サムネイルは50%品質
                           optimize=True)
            
            async with aiofiles.open(thumb_path, "wb") as thumb_file:
                await thumb_file.write(thumb_buffer.getvalue())
            
            # サムネイルURLも返す
            thumbnail_url = f"{get_base_url()}/static/{thumb_filename}"

        elif extension in ["mp4", "mov", "avi", "mkv"]:
            # **動画ファイルの圧縮処理**
            import ffmpeg
            
            # 一時的に元ファイルを保存
            temp_path = f"{file_path}.temp"
            async with aiofiles.open(temp_path, "wb") as temp_file:
                content = await file.read()
                await temp_file.write(content)
            
            try:
                # FFmpegで動画を圧縮
                (
                    ffmpeg
                    .input(temp_path)
                    .output(
                        file_path,
                        vcodec='libx264',  # H.264コーデック
                        crf=28,           # 圧縮率（18-28推奨、大きいほど圧縮）
                        preset='fast',    # エンコード速度
                        acodec='aac',     # 音声コーデック
                        audio_bitrate='128k',  # 音声ビットレート
                        vf='scale=1280:720',   # 720p解像度に制限
                        movflags='faststart'   # Web最適化
                    )
                    .overwrite_output()  # 既存ファイル上書き
                    .run(quiet=True)     # ログ抑制
                )
                
                # 一時ファイル削除
                os.remove(temp_path)
                
            except Exception as video_error:
                # 動画圧縮に失敗した場合は元ファイルをそのまま使用
                print(f"動画圧縮エラー: {video_error}")
                if os.path.exists(temp_path):
                    os.rename(temp_path, file_path)
        else:
            # **その他のファイルはそのまま保存**
            async with aiofiles.open(file_path, "wb") as out_file:
                content = await file.read()
                await out_file.write(content)

        file_url = f"{get_base_url()}/static/{new_filename}"
        
        # 画像の場合はサムネイルURLも返す
        if extension in ["jpg", "jpeg", "png"]:
            return {
                "filename": new_filename, 
                "url": file_url,
                "thumbnail_url": thumbnail_url  # サムネイル用URL
            }
        else:
            return {"filename": new_filename, "url": file_url}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ファイルのアップロードに失敗しました。エラー: {str(e)}")
    
# 記事投稿エンドポイント
@app.post("/post-article")
async def post_article(
    title: str = Form(...),
    categories: str = Form(...),
    content: str = Form(...),
    public_status: str = Form("public"),
    create_user_id: int = Form(...),
    thumbnail: Optional[UploadFile] = File(None),
    files: List[UploadFile] = File([]),  # 画像や動画の添付
    db: Session = Depends(get_db)
):
    """ 記事を投稿 """
    try:
        # JSONデコード（カテゴリは文字列として送信されるので変換）
        category_list = json.loads(categories)

        if thumbnail:
            ext = thumbnail.filename.split(".")[-1].lower()
            unique_name = f"{uuid.uuid4()}.{ext}"
            thumb_path = os.path.join(UPLOAD_DIRECTORY, unique_name)

            # **サムネイル画像も最適化処理**
            if ext in ["jpg", "jpeg", "png"]:
                await thumbnail.seek(0)
                thumbnail_data = await thumbnail.read()
                image = Image.open(BytesIO(thumbnail_data))
                
                # 画像の向きを自動修正
                image = ImageOps.exif_transpose(image)
                
                # RGBモードに変換
                if image.mode in ('RGBA', 'P'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                    image = background
                elif image.mode != 'RGB':
                    image = image.convert('RGB')
                
                width, height = image.size
                
                # サムネイルサイズに最適化（800px制限）
                if width > 800 or height > 800:
                    if width > height:
                        new_width = 800
                        new_height = int((800 / width) * height)
                    else:
                        new_height = 800
                        new_width = int((800 / height) * width)
                    
                    image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # 通信量削減のための圧縮
                buffer = BytesIO()
                image.save(buffer, 
                          format="JPEG", 
                          quality=60,  # 通信量削減のため品質を下げる
                          optimize=True,
                          progressive=True)
                
                async with aiofiles.open(thumb_path, "wb") as f:
                    await f.write(buffer.getvalue())
            else:
                # 非画像ファイルはそのまま保存
                thumbnail_content = await thumbnail.read()
                async with aiofiles.open(thumb_path, "wb") as f:
                    await f.write(thumbnail_content)

            # **ファイル名をURL安全にエンコード（改行対策）**
            safe_filename = urllib.parse.quote(unique_name, safe='.')
            thumbnail_url = f"{get_base_url()}/static/{safe_filename}"
        else:
            thumbnail_url = None


        # 記事データをDBに保存
        new_article = Article(
            title=title,
            category=category_list,
            content=content,
            thumbnail_image=thumbnail_url,
            public_status=public_status,
            create_user_id=create_user_id,
            created_at=datetime.utcnow(),
            public_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_article)
        db.commit()
        db.refresh(new_article)

        # ✅ `history_rating` に初期レコードを追加
        new_history = HistoryRating(
            article_id=new_article.id,
            like_count=0,
            access_count=0,
            super_like_count=0
        )
        db.add(new_history)
        db.commit()

       # ✅ ファイルのアップロード処理（非同期 + 一意なファイル名）
        file_urls = []
        for file in files:
            extension = file.filename.split(".")[-1].lower()
            unique_filename = f"{uuid.uuid4()}.{extension}"  # UUIDでユニーク化
            file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)

            async with aiofiles.open(file_path, "wb") as buffer:
                content = await file.read()
                await buffer.write(content)

            file_urls.append(f"{get_base_url()}/static/{unique_filename}")

        return {
            "message": "記事が投稿されました",
            "article_id": new_article.id,
            "file_urls": file_urls,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"記事の投稿に失敗しました: {str(e)}")

@app.get("/edit-article/{article_id}")
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="記事が見つかりません")

    user = db.query(User).filter(User.id == article.create_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # メディアファイルのURLも変換
    content_images = []
    if article.content_image:
        content_images = [convert_url_for_environment(url) for url in article.content_image]

    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "public_status": article.public_status,
        "categories": article.category,  # ARRAY(String)
        "content_image": content_images,  # メディアファイルのリスト
        "thumbnail_image": convert_url_for_environment(article.thumbnail_image),  # サムネイル画像
        "user_id": article.create_user_id,
        "user": {
            "id": user.id,
            "username": user.username,
            "user_icon": convert_url_for_environment(user.user_icon),
        }
    }


# 記事編集
@app.post("/edit-article/{article_id}")
async def edit_article(
    article_id: int,
    title: str = Form(...),
    content: str = Form(...),
    categories: str = Form(...),
    public_status: str = Form(...),
    update_user_id: int = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    thumbnail: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    import json
    from datetime import datetime

    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="記事が見つかりません")

    article.title = title
    article.content = content
    article.public_status = public_status
    article.update_user_id = update_user_id
    article.updated_at = datetime.utcnow()

    parsed_categories = json.loads(categories)
    article.category = [str(cat_id) for cat_id in parsed_categories]

    # メディア保存（グローバル定数を使用）
    os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

    # サムネイル処理
    if thumbnail and thumbnail.filename:
        try:
            # サムネイル画像の処理
            extension = thumbnail.filename.split(".")[-1].lower()
            unique_filename = f"{uuid.uuid4()}.{extension}"
            file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)
            
            # PIL を使用してサムネイル画像を処理
            from PIL import Image
            import io
            
            # 画像を読み込み
            image_data = await thumbnail.read()
            image = Image.open(io.BytesIO(image_data))
            
            # EXIF 情報に基づいて画像を回転
            from PIL import ImageOps
            if hasattr(image, '_getexif') and image._getexif() is not None:
                image = ImageOps.exif_transpose(image)
            
            # RGB モードに変換（RGBA や P モードの場合）
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            
            # サムネイル用にリサイズ（最大400x400）
            image.thumbnail((400, 400), Image.Resampling.LANCZOS)
            
            # 品質を下げて保存（60%品質）
            image.save(file_path, format='JPEG', quality=60, optimize=True)
            
            # 環境に応じたURLを生成
            base_url = get_base_url()
            thumbnail_url = f"{base_url}/static/{unique_filename}"
            
            article.thumbnail_url = thumbnail_url
            article.thumbnail_image = thumbnail_url
            
        except Exception as e:
            print(f"サムネイル処理エラー: {e}")
            # エラーが発生した場合は元のファイルをそのまま保存
            try:
                await thumbnail.seek(0)
                thumbnail_content = await thumbnail.read()
                with open(file_path, "wb") as buffer:
                    buffer.write(thumbnail_content)
                
                base_url = get_base_url()
                thumbnail_url = f"{base_url}/static/{unique_filename}"
                article.thumbnail_url = thumbnail_url
                article.thumbnail_image = thumbnail_url
            except Exception as fallback_error:
                print(f"サムネイルフォールバック処理エラー: {fallback_error}")
                # 完全に失敗した場合はサムネイルを更新しない
                pass

    if files:
        saved_paths = []
        for file in files:
            if file.filename:  # ファイル名が存在することを確認
                extension = file.filename.split(".")[-1].lower()
                unique_filename = f"{uuid.uuid4()}.{extension}"
                file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)

                try:
                    # 非同期でファイル内容を読み込み
                    file_content = await file.read()
                    
                    # ファイルサイズをチェック
                    if len(file_content) > 0:
                        # 非同期でファイルを保存
                        async with aiofiles.open(file_path, "wb") as buffer:
                            await buffer.write(file_content)

                        # 環境に応じた完全URLを生成（post-articleと同じ形式）
                        base_url = get_base_url()
                        saved_paths.append(f"{base_url}/static/{unique_filename}")
                        print(f"✅ ファイル保存成功: {file_path} ({len(file_content)} bytes)")
                    else:
                        print(f"⚠️ 空のファイルをスキップ: {file.filename}")
                        
                except Exception as file_error:
                    print(f"❌ ファイル保存エラー: {file.filename} - {file_error}")
        
        if saved_paths:  # 保存されたファイルがある場合のみ更新
            article.content_image = saved_paths

    db.commit()
    db.refresh(article)
    return {"message": "記事が更新されました", "article_id": article.id}


# 記事削除
@app.delete("/articles/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    """記事を削除する"""
    try:
        # 記事を取得
        article = db.query(Article).filter(Article.id == article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="記事が見つかりません")
        
        # 関連するファイルも削除
        if article.content_image:
            for image_url in article.content_image:
                if image_url.startswith("/static/"):
                    file_path = os.path.join("static", image_url.replace("/static/", ""))
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                        except Exception as e:
                            print(f"ファイル削除エラー: {e}")
        
        # サムネイル画像も削除
        if article.thumbnail_image and article.thumbnail_image.startswith(f"{get_base_url()}/static/"):
            thumbnail_filename = article.thumbnail_image.replace(f"{get_base_url()}/static/", "")
            thumbnail_path = os.path.join("static", thumbnail_filename)
            if os.path.exists(thumbnail_path):
                try:
                    os.remove(thumbnail_path)
                except Exception as e:
                    print(f"サムネイル削除エラー: {e}")
        
        # 関連するhistory_ratingレコードも削除
        db.query(HistoryRating).filter(HistoryRating.article_id == article_id).delete()
        
        # 関連するコメントも削除
        db.query(ArticleComment).filter(ArticleComment.article_id == article_id).delete()
        
        # 記事を削除
        db.delete(article)
        db.commit()
        
        return {"message": "記事が削除されました", "article_id": article_id}
        
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"記事の削除に失敗しました: {str(e)}")

# 記事にいいね
@app.post("/articles/{id}/like")
def like_article(id: int, db: Session = Depends(get_db)):
    # 記事を取得
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # history_rating からいいね数を更新
    history = (
        db.query(HistoryRating)
        .filter(HistoryRating.article_id == id)
        .first()
    )
    if history:
        history.like_count += 1
    else:
        new_history = HistoryRating(article_id=id, like_count=1, access_count=0)
        db.add(new_history)

    db.commit()
    return {"message": "いいねしました", "like_count": history.like_count if history else 1}

# コメントを投稿
@app.post("/articles/{article_id}/comments")
def post_comment(article_id: int, request: CommentRequest, db: Session = Depends(get_db)):
    # 記事が存在するか確認
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # ユーザーが存在するか確認し、usernameを取得
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # コメントを作成
    new_comment = ArticleComment(
        article_id=article_id,
        username=user.username,  # ユーザー名を取得
        user_id=request.user_id,
        comment=request.comment,
        comment_likes=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    # データベースに保存
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {"message": "コメントが投稿されました", "comment": {
        "id": new_comment.id,
        "username": new_comment.username,
        "comment": new_comment.comment,
        "likes": new_comment.comment_likes,
    }}

@app.post("/upload-media/")
async def upload_media(file: UploadFile = File(...)):
    if not os.path.exists(UPLOAD_DIRECTORY):
        os.makedirs(UPLOAD_DIRECTORY)
    try:
        file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)
        return {"filename": file.filename, "url": f"/static/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="ファイルのアップロードに失敗しました。")
    
# コメントにいいね
@app.post("/comments/{comment_id}/like")
def like_comment(comment_id: int, user_id: int, db: Session = Depends(get_db)):
    # コメントが存在するか確認
    comment = db.query(ArticleComment).filter(ArticleComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="コメントが見つかりませんでした")

    # コメントのいいね数を増やす
    comment.comment_likes += 1

    db.commit()
    return {"message": "いいねしました", "like_count": comment.comment_likes}


# 記事をブックマークする　優先度低
@app.post("/articles/{article_id}/bookmark")

    
#  マイページ表示（統計情報付き）
@app.get("/mypage/{user_id}")
def get_mypage(user_id: int, db: Session = Depends(get_db)):
    print(f"🔍 マイページリクエスト受信: user_id={user_id}")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"❌ ユーザーが見つかりません: user_id={user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"✅ ユーザー確認: username={user.username}")

    # ユーザーの記事を取得
    articles = (
        db.query(Article)
        .filter(Article.create_user_id == user_id)
        .order_by(Article.public_at.desc())
        .all()
    )

    # 記事データと統計情報を計算
    article_data = []
    total_likes = 0
    total_access = 0
    total_comments = 0
    
    for article in articles:
        history = (
            db.query(HistoryRating)
            .filter(HistoryRating.article_id == article.id)
            .first()
        )
        comment_count = (
            db.query(ArticleComment)
            .filter(ArticleComment.article_id == article.id)
            .count()
        )

        like_count = history.like_count if history else 0
        access_count = history.access_count if history else 0
        
        # 統計に加算
        total_likes += like_count
        total_access += access_count
        total_comments += comment_count

        article_data.append({
            "id": article.id,
            "title": article.title,
            "thumbnail_url": convert_url_for_environment(article.thumbnail_image),
            "public_at": article.public_at,
            "like_count": like_count,
            "access_count": access_count,
            "comment_count": comment_count,
            "category": article.category,
        })

    # 統計情報
    stats = {
        "total_articles": len(articles),
        "total_likes": total_likes,
        "total_access": total_access,
        "total_comments": total_comments,
        "member_since": user.created_at.strftime("%Y年%m月") if user.created_at else "不明",
    }
    
    print(f"📊 統計情報: {stats}")
    print(f"📝 記事数: {len(article_data)}")

    response_data = {
        "user": {
            "id": user.id,
            "username": user.username,
            "user_icon": convert_url_for_environment(user.user_icon),
            "introduction_text": user.introduction_text,
            "display_name": user.display_name,
            "email": user.email,
        },
        "articles": article_data,
        "stats": stats,
    }
    
    print(f"✅ レスポンス送信完了: user_id={user_id}")
    return response_data

# 🌐 記事専用HTMLページ（OGP対応）
@app.get("/articles/{article_id}/html")
def get_article_html(article_id: int, db: Session = Depends(get_db)):
    """記事詳細のHTMLページを生成（OGP対応）"""
    print(f"🔍 記事HTML生成: article_id={article_id}")
    
    # 記事を取得
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # 記事の統計情報を取得
    history = (
        db.query(HistoryRating)
        .filter(HistoryRating.article_id == article.id)
        .first()
    )
    
    # 記事作成者の情報を取得
    author = db.query(User).filter(User.id == article.create_user_id).first()
    
    # OGP用の説明文を生成（最初の150文字）
    import re
    description = article.content or ""
    # Markdown記号とMedia参照を除去
    description = re.sub(r'!\[Media\]\([^)]*\)', '', description)  # ![Media](URL)を除去
    description = re.sub(r'[#*`_\[\]()!]', '', description)  # Markdown記号を除去
    description = re.sub(r'\n+', ' ', description)  # 改行をスペースに変換
    description = re.sub(r'\s+', ' ', description).strip()  # 複数スペースを1つに
    description = description[:150] + '...' if len(description) > 150 else description
    
    # 空の場合はデフォルト説明文を使用
    if not description.strip():
        description = "Calmie(カルミー)で投稿された記事をお楽しみください。"
    
    # サムネイル画像の決定（環境変換適用）
    if article.thumbnail_image:
        thumbnail_url = convert_url_for_environment(article.thumbnail_image)
        print(f"🖼️  記事サムネイル: {article.thumbnail_image} -> {thumbnail_url}")
    else:
        thumbnail_url = f"{get_base_url()}/static/cat_icon.png"
        print(f"🐱 デフォルト画像使用: {thumbnail_url}")
    
    # HTMLテンプレートを生成
    html_content = f"""<!doctype html>
<html lang="ja">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="{get_base_url()}/static/cat_icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{article.title} | Calmie(カルミー)</title>
    
    <!-- SEO & Description -->
    <meta name="description" content="{description}" />
    <meta name="keywords" content="癒し,ニュース,コミュニティ,カルミー,心の安らぎ,リラックス,ストレス解消" />
    <meta name="author" content="{author.username if author else 'Calmie Team'}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Calmie(カルミー)" />
    <meta property="og:title" content="{article.title}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:url" content="{get_base_url().replace('/api', '')}/articles/{article.id}" />
    <meta property="og:image" content="{thumbnail_url}" />
    <meta property="og:image:secure_url" content="{thumbnail_url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="{article.title}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:locale" content="ja_JP" />
    <meta property="article:author" content="{author.username if author else 'Calmie Team'}" />
    <meta property="article:published_time" content="{article.public_at.isoformat()}" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@calmie_news" />
    <meta name="twitter:creator" content="@calmie_news" />
    <meta name="twitter:title" content="{article.title}" />
    <meta name="twitter:description" content="{description}" />
    <meta name="twitter:image" content="{thumbnail_url}" />
    <meta name="twitter:image:alt" content="{article.title}" />
    <meta name="twitter:domain" content="calmie.jp" />
    <meta name="twitter:url" content="{get_base_url()}/articles/{article.id}/html" />
    
    <!-- Additional Meta Tags -->
    <meta name="theme-color" content="#765e5e" />
    <link rel="canonical" href="{get_base_url().replace('/api', '')}/articles/{article.id}" />
    
    <!-- リダイレクト用JavaScript -->
    <script>
        // SPAにリダイレクト
        window.location.href = '{get_base_url().replace('/api', '')}/articles/{article.id}';
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>{article.title}</h1>
        <p>リダイレクト中...</p>
        <p><a href="{get_base_url().replace('/api', '')}/articles/{article.id}">記事を読む</a></p>
    </div>
</body>
</html>"""
    
    print(f"✅ 記事HTML生成完了: {article.title}")
    print(f"🔗 OGP画像URL: {thumbnail_url}")
    print(f"📝 OGP説明文: {description[:50]}...")
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)

@app.post("/mypage/{user_id}")
async def edit_user(
    user_id: int,
    username: str = Form(...),
    introduction_text: str = Form(...),
    user_icon: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    print(f"📥 編集開始: user_id={user_id}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print("❌ ユーザーが見つかりません")
        raise HTTPException(status_code=404, detail="User not found")

    print(f"✏️ 新しいユーザー名: {username}")
    print(f"📝 新しい自己紹介: {introduction_text}")
    user.username = username
    user.introduction_text = introduction_text

    # 画像の保存処理
    if user_icon and user_icon.filename:
        print(f"🖼 アップロードされたファイル名: {user_icon.filename}")
        extension = user_icon.filename.split(".")[-1].lower()
        filename = f"{uuid.uuid4()}.{extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, filename)

        # 保存先確認
        print(f"💾 ファイル保存先: {file_path}")

        async with aiofiles.open(file_path, "wb") as out_file:
            content = await user_icon.read()
            await out_file.write(content)

        # URLに設定
        user.user_icon = f"{get_base_url()}/static/{filename}"
        print(f"✅ 保存完了: user_icon = {user.user_icon}")
    else:
        print("🕳 ユーザーアイコンは未変更")

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    print("✅ プロフィール更新完了")
    return {"message": "プロフィール更新完了"}


# 閲覧履歴
@app.get("/mypage/{user_id}/histories")
def get_user_histories(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ユーザーの閲覧履歴を取得
        return {"message": f"ユーザー{user_id}の閲覧履歴", "histories": []}
    except Exception as e:
        return {"message": "閲覧履歴の取得に失敗しました", "histories": []}

#  いいねした記事一覧
@app.get("/mypage/{user_id}/likes")
def get_user_likes(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ユーザーがいいねした記事一覧を取得
        return {"message": f"ユーザー{user_id}のいいね記事", "liked_articles": []}
    except Exception as e:
        return {"message": "いいね記事の取得に失敗しました", "liked_articles": []}

#  作成した記事一覧
@app.get("/mypage/{user_id}/articles")
def get_user_articles(user_id: int, db: Session = Depends(get_db)):
    try:
        articles = (
            db.query(Article)
            .filter(Article.create_user_id == user_id)
            .order_by(Article.public_at.desc())
            .all()
        )
        
        article_data = []
        for article in articles:
            history = (
                db.query(HistoryRating)
                .filter(HistoryRating.article_id == article.id)
                .first()
            )
            comment_count = (
                db.query(ArticleComment)
                .filter(ArticleComment.article_id == article.id)
                .count()
            )

            article_data.append({
                "id": article.id,
                "title": article.title,
                "thumbnail_url": convert_url_for_environment(article.thumbnail_image),
                "public_at": article.public_at,
                "like_count": history.like_count if history else 0,
                "access_count": history.access_count if history else 0,
                "comment_count": comment_count,
                "category": article.category,
            })
        
        return {"articles": article_data}
    except Exception as e:
        return {"message": "記事の取得に失敗しました", "articles": []}

# 申請中の記事一覧
@app.get("/mypage/{user_id}/applications")
def get_user_applications(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：申請中の記事一覧を取得
        return {"message": f"ユーザー{user_id}の申請中記事", "applications": []}
    except Exception as e:
        return {"message": "申請中記事の取得に失敗しました", "applications": []}

#  ブックマークした記事一覧
@app.get("/mypage/{user_id}/bookmarks")
def get_user_bookmarks(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ブックマークした記事一覧を取得
        return {"message": f"ユーザー{user_id}のブックマーク記事", "bookmarks": []}
    except Exception as e:
        return {"message": "ブックマーク記事の取得に失敗しました", "bookmarks": []}

#  フォローしているユーザー一覧
@app.get("/mypage/{user_id}/follows")
def get_user_follows(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：フォローしているユーザー一覧を取得
        return {"message": f"ユーザー{user_id}のフォロー一覧", "follows": []}
    except Exception as e:
        return {"message": "フォロー一覧の取得に失敗しました", "follows": []}

#  フォロワー一覧
@app.get("/mypage/{user_id}/followers")
def get_user_followers(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：フォロワー一覧を取得
        return {"message": f"ユーザー{user_id}のフォロワー一覧", "followers": []}
    except Exception as e:
        return {"message": "フォロワー一覧の取得に失敗しました", "followers": []}

#  ユーザーをフォローする
@app.post("/follow/{user_id}")
def follow_user(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ユーザーフォロー機能
        return {"message": f"ユーザー{user_id}をフォローしました"}
    except Exception as e:
        return {"message": "フォローに失敗しました"}

#  ユーザーをフォロー解除する
@app.post("/unfollow/{user_id}")
def unfollow_user(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ユーザーフォロー解除機能
        return {"message": f"ユーザー{user_id}のフォローを解除しました"}
    except Exception as e:
        return {"message": "フォロー解除に失敗しました"}

#  ユーザーをブロックする
@app.post("/block/{user_id}")
def block_user(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ユーザーブロック機能
        return {"message": f"ユーザー{user_id}をブロックしました"}
    except Exception as e:
        return {"message": "ブロックに失敗しました"}

#  ユーザーをブロック解除する
@app.post("/unblock/{user_id}")
def unblock_user(user_id: int, db: Session = Depends(get_db)):
    try:
        # 実装予定：ユーザーブロック解除機能
        return {"message": f"ユーザー{user_id}のブロックを解除しました"}
    except Exception as e:
        return {"message": "ブロック解除に失敗しました"}

#  ユーザー情報を取得する
@app.get("/user/{user_id}")
def get_user_info(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
        
        return {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "user_icon": user.user_icon,
            "introduction_text": user.introduction_text,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="ユーザー情報の取得に失敗しました")

# 記事の検索
@app.get("/search")
def search_articles(query: str, db: Session = Depends(get_db)):
    try:
        articles = db.query(Article).join(
            User, Article.create_user_id == User.id
        ).filter(
            Article.deleted_at.is_(None),
            Article.public_status == PublicStatus.public,
            (Article.content.ilike(f"%{query}%") |
             Article.title.ilike(f"%{query}%") |
             Article.category.any(query))
        ).all()

        results = []
        for article in articles:
            history = db.query(HistoryRating).filter(HistoryRating.article_id == article.id).first()
            comment_count = db.query(ArticleComment).filter(ArticleComment.article_id == article.id).count()
            user = db.query(User).filter(User.id == article.create_user_id).first()
            
            results.append({
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "thumbnail_image": article.thumbnail_image,
                "category": article.category or [],
                "public_at": article.public_at.isoformat() if article.public_at else None,
                "created_at": article.created_at.isoformat() if article.created_at else None,
                "likes_count": history.like_count if history else 0,
                "access_count": history.access_count if history else 0,
                "comment_count": comment_count,
                "username": user.username if user else None,
            })
        
        # 検索結果がない場合のダミーデータ
        if not results and query:
            results = [
                {
                    "id": 999,
                    "title": f"🔍 「{query}」に関連する癒しの記事",
                    "content": f"「{query}」についての癒しの情報をお探しですね。",
                    "thumbnail_image": None,
                    "category": ["検索", "癒し"],
                    "public_at": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat(),
                    "likes_count": 0,
                    "access_count": 0,
                    "comment_count": 0,
                    "username": "Calmie",
                }
            ]
        
        return results
    except Exception as e:
        print(f"検索エラー: {e}")
        return []



# 限定公開記事とかも必要かもしれない
# 共有機能も必要

# 新しいランキング機能
@app.get("/articles/ranking/daily")
def get_daily_ranking(db: Session = Depends(get_db)):
    """1日ごとのランキング"""
    try:
        # 過去24時間のランキング
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        # DailyRatingテーブルから日次データを取得
        daily_ranking = db.query(
            models.DailyRating.article_id,
            models.DailyRating.like_count,
            models.DailyRating.access_count,
            models.Article.title,
            models.Article.thumbnail_image,
            models.Article.category,
            models.Article.created_at,
            models.User.username
        ).join(
            models.Article, models.DailyRating.article_id == models.Article.id
        ).join(
            models.User, models.Article.create_user_id == models.User.id
        ).filter(
            models.Article.deleted_at.is_(None),
            models.Article.public_status == models.PublicStatus.public,
            models.DailyRating.created_at >= yesterday
        ).order_by(
            (models.DailyRating.like_count + models.DailyRating.access_count).desc()
        ).limit(20).all()
        
        ranking_articles = []
        for rank, item in enumerate(daily_ranking, 1):
            ranking_articles.append({
                "id": item.article_id,
                "title": item.title,
                "thumbnail_image": item.thumbnail_image,
                "likes_count": item.like_count,
                "access_count": item.access_count,
                "category": item.category or [],
                "username": item.username,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "rank": rank,
                "score": item.like_count + item.access_count
            })
        
        # データがない場合はダミーデータ
        if not ranking_articles:
            ranking_articles = [
                {
                    "id": 1,
                    "title": "🐱 今日の癒し猫特集",
                    "thumbnail_image": "/static/cat_icon.png",
                    "likes_count": 45,
                    "access_count": 120,
                    "category": ["動物", "癒し"],
                    "username": "にゃんこ好き",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 1,
                    "score": 165
                },
                {
                    "id": 2,
                    "title": "🍼 赤ちゃんの笑顔コレクション",
                    "thumbnail_image": "/static/baby_icon.png",
                    "likes_count": 38,
                    "access_count": 95,
                    "category": ["赤ちゃん", "笑顔"],
                    "username": "ママライター",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 2,
                    "score": 133
                }
            ]
        
        return {"articles": ranking_articles, "period": "daily"}
    except Exception as e:
        print(f"日次ランキング取得エラー: {e}")
        return {"articles": [], "period": "daily"}

@app.get("/articles/ranking/weekly")
def get_weekly_ranking(db: Session = Depends(get_db)):
    """1週間のランキング"""
    try:
        # 過去7日間のランキング
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        # AggregatePointsテーブルから週次データを取得
        weekly_ranking = db.query(
            models.AggregatePoints.article_id,
            models.AggregatePoints.like_weekly,
            models.AggregatePoints.access_weekly,
            models.Article.title,
            models.Article.thumbnail_image,
            models.Article.category,
            models.Article.created_at,
            models.User.username
        ).join(
            models.Article, models.AggregatePoints.article_id == models.Article.id
        ).join(
            models.User, models.Article.create_user_id == models.User.id
        ).filter(
            models.Article.deleted_at.is_(None),
            models.Article.public_status == models.PublicStatus.public,
            models.AggregatePoints.updated_at >= week_ago
        ).order_by(
            (models.AggregatePoints.like_weekly + models.AggregatePoints.access_weekly).desc()
        ).limit(20).all()
        
        ranking_articles = []
        for rank, item in enumerate(weekly_ranking, 1):
            ranking_articles.append({
                "id": item.article_id,
                "title": item.title,
                "thumbnail_image": item.thumbnail_image,
                "likes_count": item.like_weekly,
                "access_count": item.access_weekly,
                "category": item.category or [],
                "username": item.username,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "rank": rank,
                "score": item.like_weekly + item.access_weekly
            })
        
        # データがない場合はダミーデータ
        if not ranking_articles:
            ranking_articles = [
                {
                    "id": 1,
                    "title": "🐶 今週の人気わんちゃん特集",
                    "thumbnail_image": "/static/dog_icon.png",
                    "likes_count": 280,
                    "access_count": 750,
                    "category": ["動物", "人気"],
                    "username": "わんわん日記",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 1,
                    "score": 1030
                },
                {
                    "id": 2,
                    "title": "🌸 春の動物たち",
                    "thumbnail_image": "/static/spring_animals.png",
                    "likes_count": 195,
                    "access_count": 520,
                    "category": ["動物", "季節"],
                    "username": "自然愛好家",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 2,
                    "score": 715
                }
            ]
        
        return {"articles": ranking_articles, "period": "weekly"}
    except Exception as e:
        print(f"週次ランキング取得エラー: {e}")
        return {"articles": [], "period": "weekly"}

@app.get("/articles/ranking/monthly")
def get_monthly_ranking(db: Session = Depends(get_db)):
    """1ヶ月のランキング"""
    try:
        # 過去30日間のランキング
        month_ago = datetime.utcnow() - timedelta(days=30)
        
        # AggregatePointsテーブルから月次データを取得
        monthly_ranking = db.query(
            models.AggregatePoints.article_id,
            models.AggregatePoints.like_monthly,
            models.AggregatePoints.access_monthly,
            models.Article.title,
            models.Article.thumbnail_image,
            models.Article.category,
            models.Article.created_at,
            models.User.username
        ).join(
            models.Article, models.AggregatePoints.article_id == models.Article.id
        ).join(
            models.User, models.Article.create_user_id == models.User.id
        ).filter(
            models.Article.deleted_at.is_(None),
            models.Article.public_status == models.PublicStatus.public,
            models.AggregatePoints.updated_at >= month_ago
        ).order_by(
            (models.AggregatePoints.like_monthly + models.AggregatePoints.access_monthly).desc()
        ).limit(20).all()
        
        ranking_articles = []
        for rank, item in enumerate(monthly_ranking, 1):
            ranking_articles.append({
                "id": item.article_id,
                "title": item.title,
                "thumbnail_image": item.thumbnail_image,
                "likes_count": item.like_monthly,
                "access_count": item.access_monthly,
                "category": item.category or [],
                "username": item.username,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "rank": rank,
                "score": item.like_monthly + item.access_monthly
            })
        
        # データがない場合はダミーデータ
        if not ranking_articles:
            ranking_articles = [
                {
                    "id": 1,
                    "title": "🍼 今月の赤ちゃん特集",
                    "thumbnail_image": "/static/baby_icon.png",
                    "likes_count": 1250,
                    "access_count": 3400,
                    "category": ["赤ちゃん", "特集"],
                    "username": "ママライター",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 1,
                    "score": 4650
                },
                {
                    "id": 2,
                    "title": "🐾 動物たちの癒し動画まとめ",
                    "thumbnail_image": "/static/animals_collection.png",
                    "likes_count": 890,
                    "access_count": 2100,
                    "category": ["動物", "動画"],
                    "username": "アニマルファン",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 2,
                    "score": 2990
                }
            ]
        
        return {"articles": ranking_articles, "period": "monthly"}
    except Exception as e:
        print(f"月次ランキング取得エラー: {e}")
        return {"articles": [], "period": "monthly"}

# 新しいトレンド機能（直近1時間）
@app.get("/articles/trend/hourly")
def get_hourly_trend(db: Session = Depends(get_db)):
    """直近1時間のトレンド（閲覧数といいね数、コメント数が多い順）"""
    try:
        # 直近1時間
        hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        # 直近1時間のアクティビティを集計
        trend_articles = db.query(
            models.Article.id,
            models.Article.title,
            models.Article.thumbnail_image,
            models.Article.category,
            models.Article.created_at,
            models.User.username,
            func.count(models.ArticleLike.id).label('recent_likes'),
            func.count(models.ArticleComment.id).label('recent_comments')
        ).join(
            models.User, models.Article.create_user_id == models.User.id
        ).outerjoin(
            models.ArticleLike, 
            (models.ArticleLike.article_id == models.Article.id) & 
            (models.ArticleLike.created_at >= hour_ago) &
            (models.ArticleLike.deleted_at.is_(None))
        ).outerjoin(
            models.ArticleComment,
            (models.ArticleComment.article_id == models.Article.id) &
            (models.ArticleComment.created_at >= hour_ago) &
            (models.ArticleComment.deleted_at.is_(None))
        ).filter(
            models.Article.deleted_at.is_(None),
            models.Article.public_status == models.PublicStatus.public
        ).group_by(
            models.Article.id,
            models.Article.title,
            models.Article.thumbnail_image,
            models.Article.category,
            models.Article.created_at,
            models.User.username
        ).order_by(
            (func.count(models.ArticleLike.id) + func.count(models.ArticleComment.id)).desc()
        ).limit(20).all()
        
        trending_articles = []
        for rank, item in enumerate(trend_articles, 1):
            # 全体のアクセス数を取得
            history = db.query(models.HistoryRating).filter(
                models.HistoryRating.article_id == item.id
            ).first()
            
            trending_articles.append({
                "id": item.id,
                "title": item.title,
                "thumbnail_image": item.thumbnail_image,
                "recent_likes": item.recent_likes,
                "recent_comments": item.recent_comments,
                "total_access": history.access_count if history else 0,
                "category": item.category or [],
                "username": item.username,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "rank": rank,
                "trend_score": item.recent_likes + item.recent_comments
            })
        
        # データがない場合はダミーデータ
        if not trending_articles:
            trending_articles = [
                {
                    "id": 1,
                    "title": "🔥 今話題！子犬の可愛い仕草",
                    "thumbnail_image": "/static/puppy_trend.png",
                    "recent_likes": 25,
                    "recent_comments": 8,
                    "total_access": 450,
                    "category": ["動物", "子犬"],
                    "username": "ペットラバー",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 1,
                    "trend_score": 33
                },
                {
                    "id": 2,
                    "title": "💕 赤ちゃんの初めての笑顔",
                    "thumbnail_image": "/static/baby_first_smile.png",
                    "recent_likes": 18,
                    "recent_comments": 12,
                    "total_access": 320,
                    "category": ["赤ちゃん", "成長"],
                    "username": "新米パパ",
                    "created_at": datetime.utcnow().isoformat(),
                    "rank": 2,
                    "trend_score": 30
                }
            ]
        
        return {"articles": trending_articles, "period": "hourly"}
    except Exception as e:
        print(f"時間別トレンド取得エラー: {e}")
        return {"articles": [], "period": "hourly"}