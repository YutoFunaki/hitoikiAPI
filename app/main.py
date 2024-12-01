from fastapi import FastAPI
from app import models
from app.database import engine

# モデルをDBに反映
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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

# 限定公開記事とかも必要かもしれない
# いいね機能も必要
# 共有機能も必要