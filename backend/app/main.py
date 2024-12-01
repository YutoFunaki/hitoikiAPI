from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth
from app import models
from app import firebase
from app.database import engine

# モデルをDBに反映
models.Base.metadata.create_all(bind=engine)

# リクエストボディのスキーマ
class LoginRequest(BaseModel):
    email: str
    password: str

# リクエストボディのスキーマ
class RegisterRequest(BaseModel):
    email: str
    password: str

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

@app.get("/")
def read_root():
    return {"message": "ログイン処理"}

# 記事一覧を取得する
@app.get("/articles")
def get_articles():
    return {"message": "This is a list of articles."}

# 記事一つ(セレクトしたもの)を取得する
@app.get("/articles/{article_id}")
def get_article(article_id: int):
    return {"message": f"This is an article: {article_id}"}

@app.post("/register")
def register(request: RegisterRequest):
    try:
        user = auth.create_user(email=request.email, password=request.password)
        return {"message": f"User {user.email} created successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")
    
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

# 限定公開記事とかも必要かもしれない
# いいね機能も必要
# 共有機能も必要