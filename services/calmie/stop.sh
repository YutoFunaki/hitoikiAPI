#!/bin/bash

# calmie サービス停止スクリプト

echo "🛑 Calmie サービスを停止します..."

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
    echo "🔄 開発環境のコンテナを停止しています..."
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🔄 本番環境のコンテナを停止しています..."
fi

# コンテナを停止
docker-compose -f $COMPOSE_FILE down

if [ $? -eq 0 ]; then
    echo "✅ Calmie サービスが正常に停止しました！"
    echo ""
    echo "🧹 追加オプション:"
    echo "   ボリュームも削除: docker-compose -f $COMPOSE_FILE down -v"
    echo "   イメージも削除: docker-compose -f $COMPOSE_FILE down --rmi all"
else
    echo "❌ コンテナの停止に失敗しました"
    exit 1
fi