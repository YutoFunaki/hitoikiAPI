#!/bin/bash

# calmie サービス起動スクリプト

echo "🚀 Calmie サービスを起動します..."

# カレントディレクトリがcalmieサービスディレクトリかチェック
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml が見つかりません"
    echo "   calmieサービスディレクトリで実行してください"
    exit 1
fi

# 引数で環境を指定（dev / prod）
ENVIRONMENT=${1:-prod}

if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    echo "📦 開発環境でビルド・起動します..."
else
    COMPOSE_FILE="docker-compose.yml"
    echo "📦 本番環境でビルド・起動します..."
fi

# Dockerイメージをビルドして起動
echo "🔨 Dockerイメージをビルドしています..."

# Docker Compose V2を優先的に使用、フォールバックでV1を使用
if command -v "docker" >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v "docker-compose" >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Docker Composeが見つかりません。インストールしてください。"
    exit 1
fi

echo "📋 使用するDocker Composeコマンド: $DOCKER_COMPOSE"
$DOCKER_COMPOSE -f $COMPOSE_FILE build

if [ $? -ne 0 ]; then
    echo "❌ Dockerイメージのビルドに失敗しました"
    exit 1
fi

echo "🔄 コンテナを起動しています..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d

if [ $? -eq 0 ]; then
    echo "✅ Calmie サービスが正常に起動しました！"
    echo ""
    echo "📋 アクセス情報:"
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "   🌐 フロントエンド: http://localhost:3000 (開発サーバー)"
        echo "   🔗 バックエンドAPI: http://localhost:8000 (ホットリロード)"
    else
        echo "   🌐 フロントエンド: http://localhost:3000"
        echo "   🔗 バックエンドAPI: http://localhost:8000"
    fi
    echo "   📊 pgAdmin: http://localhost:8080"
    echo "       ユーザー: admin@calmie.com"
    echo "       パスワード: admin"
    echo ""
    echo "🔍 コンテナの状態を確認:"
    $DOCKER_COMPOSE -f $COMPOSE_FILE ps
    echo ""
    echo "📄 ログを確認:"
    echo "   $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
    echo ""
    echo "🛑 停止する場合:"
    echo "   ./stop.sh"
else
    echo "❌ コンテナの起動に失敗しました"
    exit 1
fi