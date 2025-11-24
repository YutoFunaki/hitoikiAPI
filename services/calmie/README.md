# Calmie サービス

心を整える記事共有プラットフォーム「Calmie」のマイクロサービス

## 🚀 クイックスタート

### 本番環境で起動
```bash
./start.sh
```

### 開発環境で起動（ホットリロード対応）
```bash
./start.sh dev
```

### 停止
```bash
./stop.sh
# 開発環境を停止する場合
./stop.sh dev
```

## 📋 アクセス情報

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **pgAdmin**: http://localhost:8080
  - ユーザー: admin@calmie.com
  - パスワード: admin

## 🏗️ アーキテクチャ

### フロントエンド
- **フレームワーク**: React + TypeScript
- **ビルドツール**: Vite
- **UIライブラリ**: Material-UI
- **状態管理**: Zustand
- **ルーティング**: React Router
- **コンテナ**: Nginx (本番) / Vite Dev Server (開発)

### バックエンド
- **フレームワーク**: FastAPI
- **言語**: Python 3.11
- **データベース**: PostgreSQL
- **ORM**: SQLAlchemy
- **認証**: Firebase Admin SDK
- **API仕様**: OpenAPI/Swagger

### データベース
- **PostgreSQL**: 15-alpine
- **管理ツール**: pgAdmin4

## 📁 ディレクトリ構造

```
calmie/
├── docker-compose.yml          # 本番環境用
├── docker-compose.dev.yml      # 開発環境用
├── start.sh                   # 起動スクリプト
├── stop.sh                    # 停止スクリプト
├── README.md                  # このファイル
├── backend/                   # バックエンド
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py           # FastAPIメインアプリ
│   │   ├── models.py         # データベースモデル
│   │   ├── auth.py           # 認証関連
│   │   ├── database.py       # DB接続設定
│   │   └── requirements.txt  # Python依存関係
│   ├── uploads/              # アップロードファイル
│   ├── static/               # 静的ファイル
│   └── media/                # メディアファイル
└── frontend/                 # フロントエンド
    ├── Dockerfile            # 本番用
    ├── Dockerfile.dev        # 開発用
    ├── .env.docker          # Docker環境変数
    ├── src/
    │   ├── components/      # Reactコンポーネント
    │   ├── config/          # 設定ファイル
    │   ├── utils/           # ユーティリティ
    │   └── ...
    ├── package.json
    └── vite.config.ts
```

## 🛠️ 開発

### ローカル開発
```bash
# 開発環境で起動（ホットリロード有効）
./start.sh dev

# ログを確認
docker-compose -f docker-compose.dev.yml logs -f

# 特定のサービスのログを確認
docker-compose -f docker-compose.dev.yml logs -f calmie-backend-dev
```

### データベース管理
```bash
# pgAdminにアクセス
open http://localhost:8080

# 接続情報:
# Host: postgres (開発環境の場合は postgres-dev)
# Port: 5432
# Username: postgres
# Password: password
```

### API確認
```bash
# SwaggerUI
open http://localhost:8000/docs

# ReDoc
open http://localhost:8000/redoc
```

## 🐛 トラブルシューティング

### ポートが使用中の場合
```bash
# ポート使用状況を確認
lsof -i :3000
lsof -i :8000
lsof -i :5432

# プロセスを停止
kill -9 <PID>
```

### コンテナが起動しない場合
```bash
# コンテナの状態を確認
docker-compose -f docker-compose.yml ps

# ログを確認
docker-compose -f docker-compose.yml logs

# 完全にリセット
docker-compose -f docker-compose.yml down -v --rmi all
```

### データベース接続エラー
```bash
# PostgreSQLコンテナに接続
docker exec -it calmie-postgres psql -U postgres -d postgres

# データベースの状態を確認
\dt  # テーブル一覧
\d+  # 詳細情報
```

## 📝 環境変数

### フロントエンド (.env.docker)
```env
VITE_API_BASE_URL=http://localhost:8000
```

### バックエンド (docker-compose.yml内)
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/postgres
PYTHONPATH=/app/app
```

## 🔄 更新・デプロイ

### イメージの再ビルド
```bash
# 強制的に再ビルド
docker-compose -f docker-compose.yml build --no-cache

# 特定のサービスのみ
docker-compose -f docker-compose.yml build calmie-backend
```

### 本番デプロイ準備
1. 環境変数を本番用に設定
2. セキュリティ設定の確認
3. SSL証明書の設定
4. リバースプロキシの設定

## 📚 参考資料

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)