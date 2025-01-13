"""Add comments_likes and history_rating tables

Revision ID: 10943b67dc32
Revises: 38afc65f23ec
Create Date: 2024-12-07 09:21:07.229377

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10943b67dc32'
down_revision: Union[str, None] = '38afc65f23ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # comments_likes テーブルの追加
    op.create_table(
        'comments_likes',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('comment_id', sa.Integer, sa.ForeignKey('article_comments.id'), nullable=False),
        sa.Column('comment_count', sa.Integer, default=0),
        sa.Column('created_at', sa.TIMESTAMP, nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP, nullable=False),
        sa.Column('deleted_at', sa.TIMESTAMP, nullable=True),
    )

    # history_rating テーブルの追加
    op.create_table(
        'history_rating',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('article_id', sa.Integer, sa.ForeignKey('articles.id'), nullable=False),
        sa.Column('access_count', sa.Integer, default=0),
        sa.Column('like_count', sa.Integer, default=0),
        sa.Column('super_like_count', sa.Integer, default=0),
    )


def downgrade():
    # comments_likes テーブルの削除
    op.drop_table('comments_likes')

    # history_rating テーブルの削除
    op.drop_table('history_rating')
