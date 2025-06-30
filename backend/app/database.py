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

# 環境変数から読み込み（Dockerコンテナ内ではdbホストを使用）
DATABASE_URL = os.getenv("DATABASE_URL")

# Dockerコンテナ内の場合、localhostをdbに変更
if DATABASE_URL and "localhost" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("localhost", "db")
    print(f"🐳 Docker環境検出: データベースURL変更 -> {DATABASE_URL}")

# フォールバック用のデータベースURL
if not DATABASE_URL:
    DATABASE_URL = "postgresql://hitoiki_user:hitoiki_password@db:5432/hitoiki_db"
    print(f"⚠️ DATABASE_URL未設定: デフォルトURL使用 -> {DATABASE_URL}")

try:
    # エンジンとセッションの設定
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    print("✅ データベース設定完了")
except Exception as e:
    print(f"❌ データベース設定エラー: {e}")
    print("🔄 フォールバックモードで継続...")
    # フォールバック用の設定
    DATABASE_URL = "sqlite:///./fallback.db"
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

# DBセッション取得
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
