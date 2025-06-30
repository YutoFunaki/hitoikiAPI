#!/usr/bin/env python3
"""
統計データ更新バッチ処理

このスクリプトは以下の処理を行います：
1. 日次・週次・月次の統計データを更新
2. トレンドデータの計算
3. ランキングデータの生成

実行方法:
python batch_update_stats.py

cronでの定期実行推奨:
# 毎時間実行
0 * * * * /usr/bin/python3 /path/to/batch_update_stats.py

# 毎日午前2時に実行
0 2 * * * /usr/bin/python3 /path/to/batch_update_stats.py
"""

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

# パスを追加してappモジュールをインポート
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models
from app.models import (
    Article, User, ArticleLike, ArticleComment, 
    AggregatePoints, DailyRating, HistoryRating,
    PublicStatus, TargetType
)

def get_db():
    """データベースセッションを取得"""
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        print(f"データベース接続エラー: {e}")
        return None

def update_daily_stats(db: Session):
    """日次統計データを更新"""
    print("📊 日次統計データを更新中...")
    
    try:
        # 昨日の日付
        yesterday = datetime.utcnow() - timedelta(days=1)
        today = datetime.utcnow()
        
        # 全記事を取得
        articles = db.query(Article).filter(
            Article.deleted_at.is_(None),
            Article.public_status == PublicStatus.public
        ).all()
        
        for article in articles:
            # 昨日のいいね数を計算
            daily_likes = db.query(func.count(ArticleLike.id)).filter(
                and_(
                    ArticleLike.article_id == article.id,
                    ArticleLike.created_at >= yesterday,
                    ArticleLike.created_at < today,
                    ArticleLike.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            # 昨日のコメント数を計算
            daily_comments = db.query(func.count(ArticleComment.id)).filter(
                and_(
                    ArticleComment.article_id == article.id,
                    ArticleComment.created_at >= yesterday,
                    ArticleComment.created_at < today,
                    ArticleComment.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            # 昨日のアクセス数（仮想的に計算）
            # 実際のアクセス数はアクセスログから取得する必要があります
            daily_access = daily_likes * 10 + daily_comments * 5  # 仮の計算
            
            # DailyRatingテーブルを更新
            daily_rating = db.query(DailyRating).filter(
                and_(
                    DailyRating.article_id == article.id,
                    DailyRating.created_at >= yesterday,
                    DailyRating.created_at < today
                )
            ).first()
            
            if not daily_rating:
                daily_rating = DailyRating(
                    article_id=article.id,
                    access_count=daily_access,
                    like_count=daily_likes,
                    super_like_count=0,  # 仮設定
                    created_at=yesterday,
                    updated_at=datetime.utcnow()
                )
                db.add(daily_rating)
            else:
                daily_rating.access_count = daily_access
                daily_rating.like_count = daily_likes
                daily_rating.updated_at = datetime.utcnow()
        
        db.commit()
        print("✅ 日次統計データの更新完了")
        
    except Exception as e:
        print(f"❌ 日次統計データ更新エラー: {e}")
        db.rollback()

def update_aggregate_points(db: Session):
    """集計ポイントデータを更新"""
    print("📈 集計ポイントデータを更新中...")
    
    try:
        # 全記事を取得
        articles = db.query(Article).filter(
            Article.deleted_at.is_(None),
            Article.public_status == PublicStatus.public
        ).all()
        
        for article in articles:
            # 期間別の集計
            now = datetime.utcnow()
            day_ago = now - timedelta(days=1)
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            # 日次データ
            daily_likes = db.query(func.count(ArticleLike.id)).filter(
                and_(
                    ArticleLike.article_id == article.id,
                    ArticleLike.created_at >= day_ago,
                    ArticleLike.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            daily_access = daily_likes * 10  # 仮の計算
            
            # 週次データ
            weekly_likes = db.query(func.count(ArticleLike.id)).filter(
                and_(
                    ArticleLike.article_id == article.id,
                    ArticleLike.created_at >= week_ago,
                    ArticleLike.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            weekly_access = weekly_likes * 10  # 仮の計算
            
            # 月次データ
            monthly_likes = db.query(func.count(ArticleLike.id)).filter(
                and_(
                    ArticleLike.article_id == article.id,
                    ArticleLike.created_at >= month_ago,
                    ArticleLike.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            monthly_access = monthly_likes * 10  # 仮の計算
            
            # 総合データ
            total_likes = db.query(func.count(ArticleLike.id)).filter(
                and_(
                    ArticleLike.article_id == article.id,
                    ArticleLike.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            total_access = total_likes * 15  # 仮の計算
            
            # AggregatePointsテーブルを更新
            aggregate = db.query(AggregatePoints).filter(
                and_(
                    AggregatePoints.article_id == article.id,
                    AggregatePoints.target_type == TargetType.article
                )
            ).first()
            
            if not aggregate:
                aggregate = AggregatePoints(
                    target_type=TargetType.article,
                    article_id=article.id,
                    access_daily=daily_access,
                    access_weekly=weekly_access,
                    access_monthly=monthly_access,
                    access_total=total_access,
                    like_daily=daily_likes,
                    like_weekly=weekly_likes,
                    like_monthly=monthly_likes,
                    like_total=total_likes,
                    super_like_daily=0,
                    super_like_weekly=0,
                    super_like_monthly=0,
                    super_like_total=0,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(aggregate)
            else:
                aggregate.access_daily = daily_access
                aggregate.access_weekly = weekly_access
                aggregate.access_monthly = monthly_access
                aggregate.access_total = total_access
                aggregate.like_daily = daily_likes
                aggregate.like_weekly = weekly_likes
                aggregate.like_monthly = monthly_likes
                aggregate.like_total = total_likes
                aggregate.updated_at = datetime.utcnow()
        
        db.commit()
        print("✅ 集計ポイントデータの更新完了")
        
    except Exception as e:
        print(f"❌ 集計ポイントデータ更新エラー: {e}")
        db.rollback()

def update_history_rating(db: Session):
    """履歴評価データを更新"""
    print("🔄 履歴評価データを更新中...")
    
    try:
        # 全記事を取得
        articles = db.query(Article).filter(
            Article.deleted_at.is_(None),
            Article.public_status == PublicStatus.public
        ).all()
        
        for article in articles:
            # 総合いいね数
            total_likes = db.query(func.count(ArticleLike.id)).filter(
                and_(
                    ArticleLike.article_id == article.id,
                    ArticleLike.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            # 総合アクセス数（仮の計算）
            total_access = total_likes * 15 + 100  # 基本アクセス数を追加
            
            # HistoryRatingテーブルを更新
            history = db.query(HistoryRating).filter(
                HistoryRating.article_id == article.id
            ).first()
            
            if not history:
                history = HistoryRating(
                    article_id=article.id,
                    access_count=total_access,
                    like_count=total_likes,
                    super_like_count=0
                )
                db.add(history)
            else:
                history.access_count = total_access
                history.like_count = total_likes
        
        db.commit()
        print("✅ 履歴評価データの更新完了")
        
    except Exception as e:
        print(f"❌ 履歴評価データ更新エラー: {e}")
        db.rollback()

def cleanup_old_data(db: Session):
    """古いデータのクリーンアップ"""
    print("🧹 古いデータをクリーンアップ中...")
    
    try:
        # 30日以上古いDailyRatingデータを削除
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        deleted_count = db.query(DailyRating).filter(
            DailyRating.created_at < thirty_days_ago
        ).delete()
        
        db.commit()
        print(f"✅ {deleted_count}件の古いデータを削除しました")
        
    except Exception as e:
        print(f"❌ データクリーンアップエラー: {e}")
        db.rollback()

def main():
    """メイン処理"""
    print("🚀 統計データ更新バッチ処理を開始します...")
    print(f"実行時刻: {datetime.utcnow().isoformat()}")
    
    # データベース接続
    db = get_db()
    if not db:
        print("❌ データベース接続に失敗しました")
        return
    
    try:
        # 各処理を実行
        update_daily_stats(db)
        update_aggregate_points(db)
        update_history_rating(db)
        cleanup_old_data(db)
        
        print("🎉 統計データ更新バッチ処理が完了しました！")
        
    except Exception as e:
        print(f"❌ バッチ処理中にエラーが発生しました: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    main() 