# 🔄 メディア管理システム移行ガイド

## 目的
- 本番環境の既存記事（shufti*.jpg等）に影響を与えずに改修
- 段階的に新しいメディア管理システムに移行
- セキュリティとパフォーマンスの向上

## 移行段階

### Phase 1: 新システム追加（影響度: ゼロ）
- [x] MediaFileテーブル追加
- [x] `/v2/upload-media` エンドポイント追加
- [x] 既存の`/static/`配信は完全に維持

### Phase 2: データベース更新（影響度: 最小）
```bash
# 本番環境でマイグレーション実行
docker-compose exec calmie-backend python -m alembic upgrade head
```

### Phase 3: 既存ファイル移行（任意）
```bash
# 既存のstaticファイルを管理システムに登録
curl -X GET "https://calmie.jp/api/media/migrate/shufti1.jpg?user_id=1"
curl -X GET "https://calmie.jp/api/media/migrate/shufti2.jpg?user_id=1"
curl -X GET "https://calmie.jp/api/media/migrate/shufti3.jpg?user_id=1"
curl -X GET "https://calmie.jp/api/media/migrate/shufti4.jpg?user_id=1"
```

### Phase 4: フロントエンド更新（段階的）
- 新規記事投稿時は `/v2/upload-media` を使用
- 既存記事は元のURL形式を維持
- 編集時に新システムに移行

## 互換性保証

### 🟢 影響なし（既存機能）
- 既存記事の画像表示: `https://calmie.jp/api/static/shufti1.jpg`
- 既存の投稿機能: `/upload-media/`, `/post-article`
- 既存のStaticFiles配信: FastAPI mount継続

### 🆕 新機能（追加のみ）
- セキュアなメディア管理: `/v2/upload-media`
- メディア情報管理: alt text, caption, アクセス統計
- ユーザー別メディア管理: 所有権チェック
- 段階的ファイル移行: `/media/migrate/{filename}`

## 本番デプロイ手順

### 1. コード更新（影響なし）
```bash
git add .
git commit -m "Add media management system - backward compatible"
git push origin main
```

### 2. 本番デプロイ（既存機能維持）
```bash
# サーバーにSSH接続
ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181

# デプロイ実行
cd ~/hitoikiAPI/services/calmie
./deploy.sh
```

### 3. マイグレーション実行（新テーブル追加のみ）
```bash
docker-compose exec calmie-backend python -m alembic upgrade head
```

### 4. 動作確認
```bash
# 既存機能確認
curl -I https://calmie.jp/api/static/cat_icon.png  # 正常なら200

# 新機能確認
curl https://calmie.jp/api/v2/media/user/1  # 空配列が返れば成功
```

## ロールバック計画

### レベル1: 新エンドポイント無効化
```python
# main.pyで新エンドポイントをコメントアウト
# @app.post("/v2/upload-media")  # 無効化
```

### レベル2: テーブル削除（データ損失注意）
```bash
docker-compose exec calmie-backend python -m alembic downgrade -1
```

## 本番環境での確認項目

### ✅ デプロイ前チェック
- [ ] 開発環境で全エンドポイント動作確認済み
- [ ] 既存のstatic配信が正常動作
- [ ] マイグレーションファイル構文チェック済み

### ✅ デプロイ後チェック
- [ ] 既存記事の画像表示正常
- [ ] 新規記事投稿機能正常
- [ ] `/v2/upload-media`エンドポイント応答確認
- [ ] データベース接続エラーなし

## 移行完了後の利点

### セキュリティ向上
- ファイル所有権管理
- アクセス制御（public/private/limited）
- アップロードユーザー追跡

### 運用性向上  
- メディア使用統計
- ファイルサイズ・種類管理
- alt text, captionによるアクセシビリティ向上
- 論理削除による安全なファイル管理

### パフォーマンス
- サムネイル自動生成
- ファイル圧縮最適化
- アクセス数追跡による人気コンテンツ特定

## 注意事項

⚠️ **絶対に避ける操作**
- 既存のstatic/ディレクトリの移動・削除
- FastAPIのStaticFilesマウント削除
- 既存URLパス（/static/）の変更

✅ **安全な操作**
- 新エンドポイント追加
- 新テーブル追加  
- 新機能の段階的ロールアウト
- 既存機能の完全保持