# 🚀 Calmie 開発運用フローガイド

## 📋 日常開発の流れ

### 1️⃣ 開発環境のセットアップ
```bash
# 1. プロジェクトディレクトリに移動
cd ~/hitoikiAPI/hitoikiAPI/services/calmie

# 2. 開発環境を起動
./start.sh dev

# 3. 開発サーバー確認
# フロントエンド: http://localhost:3000
# バックエンドAPI: http://localhost:8001
# pgAdmin: http://localhost:8080
```

### 2️⃣ 機能開発・修正作業

#### 🖥️ **バックエンド開発**
```bash
# ファイル編集（例：新機能追加）
nano backend/app/main.py
nano backend/app/models.py

# 変更は即座にホットリロードで反映
# → Docker restart不要！
# → http://localhost:8001 で即座にテスト可能
```

#### 🎨 **フロントエンド開発**
```bash
# ファイル編集
nano frontend/src/components/NewComponent.tsx
nano frontend/src/App.tsx

# Vite開発サーバーで即座に反映
# → ブラウザで http://localhost:3000 を自動リロード
```

#### 🗄️ **データベース操作**
```bash
# pgAdmin GUIでデータベース操作
# URL: http://localhost:8080
# ユーザー: admin@calmie.com
# パスワード: admin

# または、マイグレーション実行
docker compose exec calmie-backend-dev alembic upgrade head
```

### 3️⃣ テスト・デバッグ

#### 🔍 **動作確認**
```bash
# API動作テスト
curl -X GET http://localhost:8001/

# フロントエンド表示確認
curl -I http://localhost:3000

# ログ確認
docker compose logs -f calmie-backend-dev
docker compose logs -f calmie-frontend-dev
```

#### 🐛 **デバッグ**
```bash
# リアルタイムログ監視
docker compose logs -f

# 特定コンテナのシェルに入る
docker compose exec calmie-backend-dev bash
docker compose exec calmie-frontend-dev sh

# データベース直接接続
docker compose exec postgres-dev psql -U postgres
```

### 4️⃣ 本番デプロイ

#### 🚀 **通常デプロイ（推奨）**
```bash
# 1. 変更をコミット
git add .
git commit -m "機能名: 実装内容の説明"
git push origin main

# 2. 本番サーバーに接続
ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181

# 3. 軽量デプロイ実行（約30秒）
cd ~/hitoikiAPI/services/calmie
./deploy.sh
```

#### ⚡ **緊急修正デプロイ**
```bash
# サーバーで直接編集（約10秒）
ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181
cd ~/hitoikiAPI/services/calmie
nano backend/app/main.py  # 直接編集
docker compose restart calmie-backend  # 即座反映
```

#### 🏗️ **依存関係更新時**
```bash
# requirements.txtやpackage.json変更時のみ
./start.sh prod  # フルリビルド（約3-5分）
```

## 📊 シナリオ別対応

### 🎯 **新機能開発**
```bash
# Day 1-N: ローカル開発
./start.sh dev
# コード編集 → 即座にテスト → 繰り返し

# 完成時: 本番デプロイ
git add . && git commit -m "新機能: ○○を追加"
git push && ssh server && ./deploy.sh
```

### 🐛 **バグ修正**
```bash
# 緊急時: 直接修正（10秒）
ssh server → nano main.py → restart

# 通常時: ローカル修正（30秒）
local fix → git push → ./deploy.sh
```

### 🔧 **設定変更**
```bash
# 環境変数変更
nano .env.production
docker compose restart calmie-backend

# Nginx設定変更
sudo nano /etc/nginx/sites-available/calmie.jp
sudo nginx -t && sudo systemctl reload nginx
```

### 🗄️ **データベース更新**
```bash
# マイグレーション作成（ローカル）
docker compose exec calmie-backend-dev alembic revision -m "変更内容"

# 本番適用
ssh server
docker compose exec calmie-backend alembic upgrade head
```

## 🛡️ 安全な運用ルール

### ✅ **ベストプラクティス**
1. **必ずローカルでテスト**してから本番デプロイ
2. **git commit**は小まめに、メッセージは具体的に
3. **本番変更前**に`./health-check.sh`で状態確認
4. **緊急修正後**は必ずgitにバックアップ

### ⚠️ **注意事項**
- 本番データベース直接変更は避ける
- SSL証明書の手動変更は不要（自動更新）
- 同時に複数人がデプロイしないよう調整

### 🚨 **トラブル時対応**
```bash
# サービス停止時
./stop.sh && ./start.sh prod

# ディスク容量不足時
./disk-monitor.sh && ./cleanup.sh

# 緊急ロールバック
git revert HEAD && ./deploy.sh
```

## 📅 定期メンテナンス

### 毎日
- [ ] `./health-check.sh` - 状態確認

### 週次
- [ ] `./cleanup.sh` - ディスククリーンアップ
- [ ] `./backup.sh` - データバックアップ
- [ ] `docker compose logs` - ログ確認

### 月次
- [ ] セキュリティアップデート確認
- [ ] パフォーマンス監視

## 🎯 効率化のコツ

### ⚡ **開発スピードアップ**
- ホットリロード活用で即座テスト
- pgAdmin GUIでDB操作効率化
- ログ監視でリアルタイムデバッグ

### 💰 **コスト削減**
- 軽量デプロイで通信料最小化
- 緊急修正は直接編集で時間短縮
- 定期クリーンアップでサーバー効率維持

### 🔒 **安全性確保**
- バックアップ習慣で安心運用
- ヘルスチェックで早期発見
- Git管理で変更履歴保持

---

## 🎉 まとめ
- **開発**: ローカル環境で快適開発
- **テスト**: ホットリロードで高速確認  
- **デプロイ**: 30秒軽量デプロイ
- **メンテナンス**: 自動化スクリプトで効率運用

このフローに従えば、効率的で安全な開発運用が可能です！🚀