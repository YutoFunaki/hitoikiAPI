"""Add username and user_id to users

Revision ID: 70e3a127faa7
Revises: 
Create Date: 2024-12-02 12:37:30.121402

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect  # 修正: `inspect` を使用

revision = '70e3a127faa7'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)


    # 'articles' テーブルのカラム情報を取得
    columns = [column['name'] for column in inspector.get_columns('articles')]

    # 'category' カラムが存在しない場合のみ追加
    if 'category' not in columns:
        op.add_column('articles', sa.Column('category', sa.ARRAY(sa.String()), nullable=True))

    # 他のカラムについても同様にチェック
    if 'title' not in columns:
        op.add_column('articles', sa.Column('title', sa.String(), nullable=False))
    if 'content' not in columns:
        op.add_column('articles', sa.Column('content', sa.Text(), nullable=False))

    # インデックスの確認
    indexes = [index['name'] for index in inspector.get_indexes('users')]

    # email カラムを追加
    op.add_column('users', sa.Column('email', sa.String(), nullable=True))  # email を追加

    # `ix_users_email` の削除（存在する場合のみ）
    if 'ix_users_email' in indexes:
        op.drop_index('ix_users_email', table_name='users')

    # 新しいカラムの追加
    op.add_column('users', sa.Column('hashed_password', sa.String(), nullable=True))
    op.add_column('users', sa.Column('user_id', sa.String(), nullable=False))

    # インデックスの追加
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)  # 修正: `Inspector.from_connection` -> `inspect`

    # インデックスの確認
    indexes = [index['name'] for index in inspector.get_indexes('users')]

    # インデックスの削除
    if 'ix_users_email' in indexes:
        op.drop_index('ix_users_email', table_name='users')

    # カラムの削除
    op.drop_column('users', 'user_id')
    op.drop_column('users', 'hashed_password')
