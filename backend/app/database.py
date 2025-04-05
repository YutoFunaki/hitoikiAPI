import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from pathlib import Path
import sys

# backend ディレクトリの .env.production を読み込む
dotenv_path = Path(__file__).resolve().parent.parent / ".env.production"
load_dotenv(dotenv_path=dotenv_path)

# 環境変数から読み込み
DATABASE_URL = os.getenv("DATABASE_URL")

# エンジンとセッションの設定
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DBセッション取得
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
