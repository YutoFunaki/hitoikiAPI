#!/bin/bash

# hitoikiAPI統合環境停止スクリプト
echo "🛑 hitoikiAPI統合環境を停止しています..."

# Docker Composeで全サービスを停止
docker-compose -f docker-compose.multi.yml down

echo ""
echo "✅ 全サービスが停止されました。"
echo ""
echo "🗑️  コンテナとボリュームも削除する場合:"
echo "  docker-compose -f docker-compose.multi.yml down -v --remove-orphans"
echo ""