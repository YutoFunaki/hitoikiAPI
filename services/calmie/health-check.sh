#!/bin/bash

# 🔍 Calmie ヘルスチェックスクリプト
# 本番環境の状態を確認

echo "🏥 Calmie ヘルスチェックを開始..."
echo "=================================="

# Docker サービス状態チェック
echo "📦 Docker サービス状態:"
docker compose ps
echo ""

# API接続テスト
echo "🔌 API接続テスト:"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/ || echo "ERROR")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ バックエンドAPI: 正常 (200)"
else
    echo "❌ バックエンドAPI: 異常 ($API_STATUS)"
fi

# フロントエンド接続テスト
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "ERROR")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ フロントエンド: 正常 (200)"
else
    echo "❌ フロントエンド: 異常 ($FRONTEND_STATUS)"
fi

# データベース接続テスト
echo "🗄️  データベース接続テスト:"
DB_STATUS=$(docker compose exec -T postgres pg_isready -h localhost -U postgres 2>/dev/null || echo "ERROR")
if [[ "$DB_STATUS" == *"accepting connections"* ]]; then
    echo "✅ PostgreSQL: 正常"
else
    echo "❌ PostgreSQL: 異常"
fi

# ディスク使用量
echo ""
echo "💾 ディスク使用量:"
df -h / | tail -1 | awk '{print "使用量: "$3"/"$2" ("$5")"}'

# メモリ使用量
echo ""
echo "🧠 メモリ使用量:"
free -h | grep "Mem:" | awk '{print "使用量: "$3"/"$2}'

# 最近のエラーログ（直近1時間）
echo ""
echo "📄 最近のエラーログ (直近1時間):"
if [ -f "/var/log/nginx/error.log" ]; then
    ERROR_COUNT=$(sudo find /var/log/nginx/error.log -mmin -60 -exec grep -c "error" {} \; 2>/dev/null || echo "0")
    echo "Nginxエラー: $ERROR_COUNT 件"
else
    echo "ログファイルアクセス不可"
fi

# SSL証明書有効期限
echo ""
echo "🔐 SSL証明書状態:"
if command -v openssl >/dev/null 2>&1; then
    CERT_DAYS=$(echo | openssl s_client -servername calmie.jp -connect calmie.jp:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    echo "有効期限: $CERT_DAYS"
else
    echo "OpenSSL未インストール"
fi

echo ""
echo "=================================="
echo "✅ ヘルスチェック完了"
echo "🌐 サイト: https://calmie.jp"
echo "📊 管理画面: http://52.70.99.181:8080"