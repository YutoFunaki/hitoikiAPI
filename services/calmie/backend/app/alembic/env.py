import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# プロジェクトルートディレクトリを PYTHONPATH に追加
sys.path.append("/app")  # `/app` を明示的に追加

from app.models import Base  # 修正: app.models からインポート

# Alembic Config オブジェクト
config = context.config

# ログ設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData オブジェクトを追加
target_metadata = Base.metadata

# 動的にDB接続URLを取得
def get_url():
    return config.get_main_option("sqlalchemy.url")

def run_migrations_offline() -> None:
    """オフラインモードでのマイグレーション"""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """オンラインモードでのマイグレーション"""
    connectable = engine_from_config(
        {"sqlalchemy.url": get_url()},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
