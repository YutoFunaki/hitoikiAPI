#!/bin/bash

# 🚀 軽量デプロイスクリプト
# Docker buildを避けて、コード変更を高速反映

echo "🔄 Calmie 軽量デプロイを開始します..."

# 現在のディレクトリを確認
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml が見つかりません"
    echo "   calmieサービスディレクトリで実行してください"
    exit 1
fi

# Git から最新コードを取得
echo "📥 最新コードを取得しています..."
cd ../../../
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Git pull に失敗しました"
    exit 1
fi
cd services/calmie

# Docker Compose コマンドを特定
if command -v "docker" >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v "docker-compose" >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Docker Composeが見つかりません。"
    exit 1
fi

# バックエンドコンテナのみ再起動（ボリュームマウントでコード反映）
echo "🔄 バックエンドコンテナを再起動しています..."
$DOCKER_COMPOSE restart calmie-backend

# フロントエンドに変更がある場合のみリビルド
echo "🤔 フロントエンドの変更を確認..."
FRONTEND_CHANGED=$(git diff HEAD~1 HEAD --name-only | grep "frontend/src" || echo "")

if [ ! -z "$FRONTEND_CHANGED" ]; then
    echo "🎨 フロントエンドの変更を検出。リビルドします..."
    $DOCKER_COMPOSE build calmie-frontend
    $DOCKER_COMPOSE up -d calmie-frontend
else
    echo "✅ フロントエンドに変更なし。スキップします。"
fi

# 状態確認
echo "📋 デプロイ完了！現在の状態:"
$DOCKER_COMPOSE ps

echo ""
echo "✅ 軽量デプロイが完了しました！"
echo "   🌐 サイト: https://calmie.jp"
echo "   ⏱️  所要時間: 約30秒"
echo ""
echo "📄 ログ確認:"
echo "   $DOCKER_COMPOSE logs -f calmie-backend"