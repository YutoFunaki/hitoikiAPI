# 🚀 Calmie本番環境デプロイ手順

## 前提条件
- Docker & Docker Compose がインストール済み
- Nginxがリバースプロキシとして設定済み
- ドメイン（calmie.jp）のDNS設定完了
- SSL証明書設定済み

## デプロイ手順

### 1. gitリポジトリを最新に更新
```bash
cd ~/hitoikiAPI
git reset --hard origin/main
git pull origin main
```

### 2. calmieサービスディレクトリに移動
```bash
cd services/calmie
```

### 3. 本番環境用設定ファイルの確認・編集
```bash
# .env.productionファイルを確認・編集
nano .env.production

# 必要に応じて以下を修正：
# - データベースパスワード
# - API_BASE_URL
# - その他のセキュリティ設定
```

### 4. Firebase認証ファイルの配置
```bash
# Firebase認証ファイルを適切な場所に配置
# backend/app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-b53b0762f9.json
```

### 5. 本番環境でサービス起動
```bash
# 既存のコンテナを停止（存在する場合）
./stop.sh

# 本番環境でビルド・起動
./start.sh
```

### 6. サービス状態確認
```bash
# コンテナ状態確認
docker-compose ps

# ログ確認
docker-compose logs -f

# API動作確認
curl -I https://calmie.jp/api/articles
```

### 7. Nginxリバースプロキシ設定
本番環境のNginx設定で、calmieサービスへのプロキシを設定：

```nginx
location /api {
    proxy_pass http://localhost:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## トラブルシューティング

### サービスが起動しない場合
```bash
# ログを確認
docker-compose logs calmie-backend
docker-compose logs calmie-frontend

# ポート競合チェック
netstat -tulpn | grep :8001
netstat -tulpn | grep :3000
```

### Firebase認証エラーの場合
```bash
# Firebase認証ファイルの存在確認
docker-compose exec calmie-backend ls -la /app/app/firebase/

# 権限確認
docker-compose exec calmie-backend cat /app/app/firebase/*.json | head -5
```

### データベース接続エラーの場合
```bash
# PostgreSQL接続確認
docker-compose exec postgres psql -U postgres -d postgres -c "SELECT version();"

# データベースの初期化が必要な場合
docker-compose exec calmie-backend python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```