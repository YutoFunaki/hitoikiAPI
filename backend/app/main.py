from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.models import User
from app import firebase
from app.database import engine
import uuid
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from app.models import Article, HistoryRating, ArticleComment  # Articleモデルをインポート
from app.database import get_db  # データベースセッションを取得する関数をインポート
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import String, cast
from datetime import datetime

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
    password: str
    username: str

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

# ユーザー登録エンドポイント
@app.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    # ユーザーの重複チェック（データベース）
    existing_user = db.query(User).filter(
        (User.firebase_user_id == request.firebase_user_id) | (User.username == request.username)
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Firebase User ID or Username is already registered")

    # Firebaseに新規ユーザー登録
    try:
        firebase_user = auth.create_user(
            email=request.email,
            password=request.password,
            display_name=request.username,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user in Firebase: {str(e)}")

    # FirebaseからのUIDを使用して新しいユーザーの作成（データベース）
    new_user = User(
        username=request.username,
        user_icon=request.user_icon,
        introduction_text=request.introduction_text,
        password_hash=pwd_context.hash(request.password),  # パスワードはハッシュ化して保存
        firebase_user_id=firebase_user.uid,
        display_name=request.display_name or request.username,  # デフォルトでusernameを表示名に使用
        prefectures=request.prefectures,
        points=0,  # 初期ポイントは0
        last_login=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        deleted_at=None,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": f"User {new_user.username} created successfully in Firebase and database"}

    
@app.post("/login")
def login(request: LoginRequest):
    try:
        # Firebaseで認証用カスタムトークンを生成
        user = auth.get_user_by_email(request.email)
        if user.email is None:
            raise Exception("User not found.")
        
        # パスワードの検証は本来Firebase側で行いますが、ここでカスタムトークンを返します
        custom_token = auth.create_custom_token(user.uid)
        return {"token": custom_token.decode('utf-8')}
    except Exception as e:
        # 詳細なエラーメッセージを返す（デバッグ用）
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
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


# 記事一覧(最新)を取得する
@app.get("/articles")
def get_articles():
    return {"message": "記事一覧(最新)を取得する"}

# 記事一覧(ランキング)を取得する
@app.get("/articles/ranking")
def get_articles():
    return {"message": "記事一覧(ランキング)を取得する"}

# 記事一覧(トレンド)を取得する
@app.get("/articles/trend")
def get_articles():
    return {"message": "記事一覧(トレンド)を取得する"}

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
            "username": comment.username,
            "user_id": comment.user_id,
            "comment": comment.comment,
            "comment_likes": comment.comment_likes,
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

# 新規記事投稿
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


# 記事をブックマークする
@app.post("/articles/{article_id}/bookmark")

    
#  マイページ表示
@app.get("/mypage/{user_id}")
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

# 下書きの記事一覧
@app.get("/mypage/{user_id}/drafts")
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

#  ユーザー情報を編集する
@app.post("/mypage/{user_id}")
def edit_user(user_id: str):
    return {"message": f"This is mypage: {user_id}"}





# 限定公開記事とかも必要かもしれない
# 共有機能も必要