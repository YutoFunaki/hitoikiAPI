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

# モデルをDBに反映
models.Base.metadata.create_all(bind=engine)

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
UPLOAD_DIRECTORY = "./uploads"
MAX_FILE_SIZE_MB = 100  # 100MBまで許可（大きめに）
MAX_IMAGE_WIDTH = 1280  # 画像の最大幅を制限
ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "mp4", "mov", "avi", "webm"]  # .mov を許可

# ディレクトリが存在しない場合は作成
if not os.path.exists(UPLOAD_DIRECTORY):
    os.makedirs(UPLOAD_DIRECTORY)

app.mount("/static", StaticFiles(directory="uploads"), name="static")

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
        if request.password:  # Google / Apple の場合 `password` を登録しない
            firebase_data["password"] = request.password
        firebase_user = auth.create_user(**firebase_data)
        firebase_user_id = firebase_user.uid
    except auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email is already registered in Firebase")
    except Exception:
        pass  # Firebase登録に失敗しても続行

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
            "public_at": article.public_at,
            "like_count": history.like_count if history else 0,
            "access_count": history.access_count if history else 0,
            "comment_count": comment_count,  # コメント数を追加
        })
    
    return result

# 記事一覧(ランキング)を取得する
@app.get("/articles/ranking")
def get_articles():
    return {"message": "記事一覧(ランキング)を取得する"}

# 記事一覧(トレンド)を取得する
@app.get("/articles/trend")
def get_articles():
    return {"message": "記事一覧(トレンド)を取得する"}

# 記事一つ(セレクトしたもの)を取得する、このときに閲覧数を増やす、限定公開の場合はログインが必要
@app.get("/articles/{id}")
def get_article(id: int, db: Session = Depends(get_db)):
    # 記事を取得
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # history_rating から like_count と access_count を取得
    history = db.query(HistoryRating).filter(HistoryRating.article_id == article.id).first()
    like_count = history.like_count if history else 0
    access_count = history.access_count if history else 0

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

    # 同じカテゴリの記事を取得
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

    # 他のユーザーの記事を取得
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

    # 結果を整形して返す
    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "thumbnail_url": article.thumbnail_image,
        "like_count": like_count,
        "access_count": access_count,
        "public_at": article.public_at,
        "comments": comment_data,
        "user": {
            "id": user.id,
            "username": user.username,
            "user_icon": user.user_icon,
            "introduction_text": user.introduction_text,
        },
        "user_articles": user_articles,
        "recommended_articles": recommended_articles,
    }

# 以下ログインが必要なエンドポイント

# 自分が作成した記事を編集する
@app.get("/edit/article/{article_id}")
def get_article(article_id: int):
    return {"message": f"This is an article: {article_id}"}

# 自分が作成した記事の編集を保存する
@app.post("/edit/article/{article_id}")
def get_article(article_id: int):
    return {"message": f"This is an article: {article_id}"}

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

        # **画像の場合は圧縮・リサイズ**
        if extension in ["jpg", "jpeg", "png"]:
            image = Image.open(file.file)
            width, height = image.size

            # **画像が大きすぎる場合はリサイズ**
            if width > MAX_IMAGE_WIDTH:
                new_height = int((MAX_IMAGE_WIDTH / width) * height)
                image = image.resize((MAX_IMAGE_WIDTH, new_height), Image.ANTIALIAS)

            # **圧縮して保存**
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=80)  # 80%の品質で圧縮
            async with aiofiles.open(file_path, "wb") as out_file:
                await out_file.write(buffer.getvalue())

        else:
            # **動画ファイル（MP4, MOVなど）はそのまま保存**
            async with aiofiles.open(file_path, "wb") as out_file:
                content = await file.read()
                await out_file.write(content)

        file_url = f"http://localhost:8000/static/{new_filename}"
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
    files: List[UploadFile] = File([]),  # 画像や動画の添付
    db: Session = Depends(get_db)
):
    """ 記事を投稿 """
    try:
        # JSONデコード（カテゴリは文字列として送信されるので変換）
        category_list = json.loads(categories)

        # 記事データをDBに保存
        new_article = Article(
            title=title,
            category=category_list,
            content=content,
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

            file_urls.append(f"http://localhost:8000/static/{unique_filename}")

        return {
            "message": "記事が投稿されました",
            "article_id": new_article.id,
            "file_urls": file_urls,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"記事の投稿に失敗しました: {str(e)}")

# 記事編集
@app.post("/edit/article")
def create_article(title: str, content: str, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """記事を投稿"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        new_article = models.Article(
            title=title,
            content=content,
            author_id=user_id  # 投稿者のユーザーID
        )
        db.add(new_article)
        db.commit()
        db.refresh(new_article)
        return {"message": "Article created successfully", "article": new_article}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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

    
#  マイページ表示　優先度高
@app.get("/mypage/{user_id}")
def get_mypage(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    articles = (
        db.query(Article)
        .filter(Article.create_user_id == user_id)
        .order_by(Article.public_at.desc())
        .all()
    )

    article_data = [
        {
            "id": article.id,
            "title": article.title,
            "thumbnail_url": article.thumbnail_image,
            "public_at": article.public_at,
        }
        for article in articles
    ]

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "user_icon": user.user_icon,
            "introduction_text": user.introduction_text,
        },
        "articles": article_data,
    }

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
        user.user_icon = f"http://localhost:8000/static/{filename}"
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
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  いいねした記事一覧
@app.get("/mypage/{user_id}/likes")
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  作成した記事一覧
@app.get("/mypage/{user_id}/articles")
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

# 申請中の記事一覧
@app.get("/mypage/{user_id}/applications")
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  ブックマークした記事一覧
@app.get("/mypage/{user_id}/bookmarks")
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  フォローしているユーザー一覧
@app.get("/mypage/{user_id}/follows")
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  フォロワー一覧
@app.get("/mypage/{user_id}/followers")
def get_mypage(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  ユーザーをフォローする
@app.post("/follow/{user_id}")
def follow_user(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  ユーザーをフォロー解除する
@app.post("/unfollow/{user_id}")
def unfollow_user(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  ユーザーをブロックする
@app.post("/block/{user_id}")
def block_user(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  ユーザーをブロック解除する
@app.post("/unblock/{user_id}")
def unblock_user(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

#  ユーザー情報を取得する
@app.get("/user/{user_id}")
def get_user(user_id: str):
    return {"message": f"This is mypage: {user_id}"}

# 記事の検索
@app.get("/search")
def search_articles(query: str, db: Session = Depends(get_db)):
    articles = db.query(Article).filter(
        Article.content.ilike(f"%{query}%") |
        Article.title.ilike(f"%{query}%") |
        Article.category.any(query)
    ).all()

    results = []
    for article in articles:
        history = db.query(HistoryRating).filter(HistoryRating.article_id == article.id).first()
        comment_count = db.query(ArticleComment).filter(ArticleComment.article_id == article.id).count()
        
        results.append({
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "public_at": article.public_at,
            "like_count": history.like_count if history else 0,
            "access_count": history.access_count if history else 0,
            "comment_count": comment_count,
        })
    return results



# 限定公開記事とかも必要かもしれない
# 共有機能も必要