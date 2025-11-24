#!/bin/bash

# hitoikiAPI統合環境開始スクリプト
echo "🚀 hitoikiAPI統合環境を開始しています..."

# Docker Composeで全サービスを起動
docker-compose -f docker-compose.multi.yml up -d

echo ""
echo "✅ サービスが開始されました！"
echo ""
echo "📊 アクセス情報:"
echo "  🌐 Nginx (リバースプロキシ): http://localhost"
echo "  📝 Calmie (記事投稿): http://localhost/calmie/"
echo "  📈 Lifetime (人生記録): http://localhost/lifetime/ (未実装)"
echo "  🗄️  pgAdmin (DB管理): http://localhost:8080"
echo ""
echo "🔗 API直接アクセス:"
echo "  📝 Calmie API: http://localhost:8001"
echo "  📈 Lifetime API: http://localhost:8002 (未実装)"
echo ""
echo "📊 サービス状況を確認:"
echo "  docker-compose -f docker-compose.multi.yml ps"
echo ""
echo "🛑 サービス停止:"
echo "  ./stop-multi.sh"
echo ""