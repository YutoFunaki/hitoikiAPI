# メディア管理テーブル追加マイグレーション
# 本番環境デプロイ時に実行

"""Add media management tables

Revision ID: add_media_management
Revises: bba57459fecb
Create Date: 2024-11-24 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_media_management'
down_revision = 'bba57459fecb'  # 最新のマイグレーションIDに変更してください
branch_labels = None
depends_on = None

def upgrade():
    # MediaFileテーブルを作成
    op.create_table('media_files',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('stored_filename', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=False),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('file_type', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('alt_text', sa.String(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('is_public', sa.String(), nullable=False),
        sa.Column('access_count', sa.Integer(), nullable=False),
        sa.Column('download_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('deleted_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stored_filename')
    )
    
    # インデックス追加
    op.create_index('ix_media_files_id', 'media_files', ['id'])
    op.create_index('ix_media_files_uploaded_by', 'media_files', ['uploaded_by'])
    op.create_index('ix_media_files_created_at', 'media_files', ['created_at'])
    op.create_index('ix_media_files_is_public', 'media_files', ['is_public'])

def downgrade():
    # インデックス削除
    op.drop_index('ix_media_files_is_public', table_name='media_files')
    op.drop_index('ix_media_files_created_at', table_name='media_files')
    op.drop_index('ix_media_files_uploaded_by', table_name='media_files')
    op.drop_index('ix_media_files_id', table_name='media_files')
    
    # テーブル削除
    op.drop_table('media_files')