# 📊 統計データ更新バッチ処理

このディレクトリには、ランキング・トレンド機能に必要な統計データを更新するバッチ処理が含まれています。

## 🚀 バッチ処理の概要

### `batch_update_stats.py`
記事の統計データ（いいね数、アクセス数、コメント数）を集計し、ランキング・トレンド表示に必要なデータを更新します。

#### 処理内容
1. **日次統計データ更新** - 過去24時間の活動を集計
2. **週次・月次統計データ更新** - 期間別の統計を更新
3. **履歴評価データ更新** - 総合的な評価データを更新
4. **古いデータのクリーンアップ** - 30日以上古いデータを削除

## 📋 実行方法

### 手動実行
```bash
# バックエンドディレクトリに移動
cd backend

# バッチ処理を実行
python batch_update_stats.py
```

### 自動実行（推奨）
cronを使用して定期実行を設定します：

```bash
# crontabを編集
crontab -e

# 以下の行を追加（毎時間実行）
0 * * * * cd /path/to/hitoikiAPI/backend && python batch_update_stats.py >> /var/log/stats_batch.log 2>&1

# または毎日午前2時に実行
0 2 * * * cd /path/to/hitoikiAPI/backend && python batch_update_stats.py >> /var/log/stats_batch.log 2>&1
```

## 🔧 設定

### データベース接続
バッチ処理は `app/database.py` の設定を使用してデータベースに接続します。
環境変数やデータベース設定が正しく設定されていることを確認してください。

### ログ出力
バッチ処理の実行状況は標準出力に表示されます。
本番環境では適切なログファイルにリダイレクトすることを推奨します。

## 📊 更新されるテーブル

### `daily_rating`
- 日次のいいね数、アクセス数、コメント数
- 過去30日分のデータを保持

### `aggregate_points`
- 日次、週次、月次、総合の統計データ
- ランキング表示で使用

### `history_rating`
- 記事の総合評価データ
- 全期間の累計値

## ⚠️ 注意事項

1. **データベースの負荷**: 大量のデータがある場合、処理に時間がかかる可能性があります
2. **同時実行**: 複数のバッチ処理が同時に実行されないよう注意してください
3. **バックアップ**: 重要なデータは事前にバックアップを取ることを推奨します

## 🐛 トラブルシューティング

### データベース接続エラー
```bash
# データベースの状態を確認
docker-compose ps

# データベースコンテナを再起動
docker-compose restart db
```

### 権限エラー
```bash
# 実行権限を付与
chmod +x batch_update_stats.py
```

### ログ確認
```bash
# バッチ処理のログを確認
tail -f /var/log/stats_batch.log
```

## 📈 パフォーマンス最適化

### インデックスの確認
統計処理のパフォーマンスを向上させるため、以下のインデックスが設定されていることを確認してください：

```sql
-- 記事テーブル
CREATE INDEX idx_articles_created_at ON articles(created_at);
CREATE INDEX idx_articles_public_status ON articles(public_status);

-- いいねテーブル
CREATE INDEX idx_article_likes_created_at ON article_likes(created_at);
CREATE INDEX idx_article_likes_article_id ON article_likes(article_id);

-- コメントテーブル
CREATE INDEX idx_article_comments_created_at ON article_comments(created_at);
CREATE INDEX idx_article_comments_article_id ON article_comments(article_id);
```

## 🔄 更新頻度の推奨

- **リアルタイム性重視**: 1時間ごと
- **バランス型**: 6時間ごと
- **負荷軽減**: 1日1回（深夜帯）

用途に応じて適切な頻度を選択してください。 