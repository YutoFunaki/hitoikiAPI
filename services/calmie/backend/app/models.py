from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum, ForeignKey, Text, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# Enum 定義
class PublicStatus(enum.Enum):
    public = "public"
    private = "private"
    draft = "draft"
    limited = "limited"
    members_only = "members_only"


class TargetType(enum.Enum):
    article = "article"
    user = "user"
    category = "category"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    user_icon = Column(String, nullable=True)
    introduction_text = Column(Text, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    points = Column(Integer, default=0)
    firebase_user_id = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=True)
    prefectures = Column(Integer, nullable=True)
    last_login = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)


class UserFollower(Base):
    __tablename__ = "user_follower"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    follow_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(ARRAY(String), nullable=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    content_image = Column(ARRAY(String), nullable=True)
    thumbnail_image = Column(String, nullable=True)
    public_status = Column(Enum(PublicStatus), nullable=False, index=True)
    prefectures = Column(Integer, nullable=True)
    create_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    likes_count = Column(Integer, default=0)
    public_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)


class ArticleLike(Base):
    __tablename__ = "article_likes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=True)
    deleted_at = Column(TIMESTAMP, nullable=True)


class ArticleComment(Base):
    __tablename__ = "article_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    comment = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_likes = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)


class AggregatePoints(Base):
    __tablename__ = "aggregate_points"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    target_type = Column(Enum(TargetType), default=TargetType.article, nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=True)
    access_daily = Column(Integer, default=0)
    access_weekly = Column(Integer, default=0)
    access_monthly = Column(Integer, default=0)
    access_total = Column(Integer, default=0)
    like_daily = Column(Integer, default=0)
    like_weekly = Column(Integer, default=0)
    like_monthly = Column(Integer, default=0)
    like_total = Column(Integer, default=0)
    super_like_daily = Column(Integer, default=0)
    super_like_weekly = Column(Integer, default=0)
    super_like_monthly = Column(Integer, default=0)
    super_like_total = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)


class DailyRating(Base):
    __tablename__ = "daily_rating"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    access_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    super_like_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)

class CommentsLike(Base):
    __tablename__ = "comments_likes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment_id = Column(Integer, ForeignKey("article_comments.id"), nullable=False)
    comment_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)

class HistoryRating(Base):
    __tablename__ = "history_rating"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    access_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    super_like_count = Column(Integer, default=0)
