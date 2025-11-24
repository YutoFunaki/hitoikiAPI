#!/bin/bash

# 💾 Calmie バックアップスクリプト
# データベースとアップロードファイルをバックアップ

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
SERVICE_NAME="calmie"

echo "💾 $SERVICE_NAME バックアップを開始..."
echo "日時: $(date)"
echo "====================================="

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR
cd $BACKUP_DIR

# データベースバックアップ
echo "📊 データベースをバックアップ中..."
docker compose -f ~/hitoikiAPI/services/calmie/docker-compose.yml exec -T postgres pg_dump -U postgres postgres > "${SERVICE_NAME}_db_${DATE}.sql"

if [ $? -eq 0 ]; then
    echo "✅ データベースバックアップ完了"
    # gzip圧縮
    gzip "${SERVICE_NAME}_db_${DATE}.sql"
    echo "📦 圧縮完了: ${SERVICE_NAME}_db_${DATE}.sql.gz"
else
    echo "❌ データベースバックアップ失敗"
fi

# アップロードファイルバックアップ
echo ""
echo "📁 アップロードファイルをバックアップ中..."
UPLOAD_SOURCE="~/hitoikiAPI/services/calmie/backend/uploads"
STATIC_SOURCE="~/hitoikiAPI/services/calmie/backend/static"

if [ -d "$UPLOAD_SOURCE" ]; then
    tar -czf "${SERVICE_NAME}_uploads_${DATE}.tar.gz" -C ~ hitoikiAPI/services/calmie/backend/uploads
    echo "✅ アップロードファイルバックアップ完了"
fi

if [ -d "$STATIC_SOURCE" ]; then
    tar -czf "${SERVICE_NAME}_static_${DATE}.tar.gz" -C ~ hitoikiAPI/services/calmie/backend/static  
    echo "✅ 静的ファイルバックアップ完了"
fi

# 設定ファイルバックアップ
echo ""
echo "⚙️  設定ファイルをバックアップ中..."
tar -czf "${SERVICE_NAME}_config_${DATE}.tar.gz" -C ~ \
    hitoikiAPI/services/calmie/.env.production \
    hitoikiAPI/services/calmie/docker-compose.yml \
    hitoikiAPI/services/calmie/backend/app/firebase/ 2>/dev/null

echo "✅ 設定ファイルバックアップ完了"

# 古いバックアップ削除（7日以上前）
echo ""
echo "🗑️  古いバックアップを削除中..."
find $BACKUP_DIR -name "${SERVICE_NAME}_*" -mtime +7 -delete
echo "✅ 7日以上前のバックアップを削除"

# バックアップサイズ確認
echo ""
echo "📊 バックアップ一覧:"
ls -lh $BACKUP_DIR/${SERVICE_NAME}_*_${DATE}*

echo ""
echo "====================================="
echo "✅ バックアップ完了！"
echo "📁 保存先: $BACKUP_DIR"
echo "💡 復元方法は OPERATION_GUIDE.md を参照"