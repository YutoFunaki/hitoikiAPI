#!/bin/bash

# 📊 ディスク監視・アラートスクリプト
# ディスク使用量を監視し、必要に応じてアラートを表示

DISK_THRESHOLD=75  # アラートしきい値（%）
CRITICAL_THRESHOLD=85  # 緊急しきい値（%）

echo "📊 ディスク使用量監視"
echo "===================="

# 現在のディスク使用量を取得
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
DISK_AVAIL=$(df -h / | tail -1 | awk '{print $4}')

echo "💾 現在のディスク使用量: $DISK_USED / $DISK_TOTAL ($DISK_USAGE%)"
echo "📁 利用可能容量: $DISK_AVAIL"
echo ""

# 使用量に応じたメッセージ表示
if [ $DISK_USAGE -ge $CRITICAL_THRESHOLD ]; then
    echo "🚨 緊急警告: ディスク使用量が${DISK_USAGE}%です！"
    echo "即座にクリーンアップが必要です:"
    echo "  ./cleanup.sh"
    echo ""
elif [ $DISK_USAGE -ge $DISK_THRESHOLD ]; then
    echo "⚠️  警告: ディスク使用量が${DISK_USAGE}%です"
    echo "近日中にクリーンアップを実行してください:"
    echo "  ./cleanup.sh"
    echo ""
else
    echo "✅ ディスク使用量正常 (${DISK_USAGE}%)"
    echo ""
fi

# 大容量ディレクトリの表示
echo "📁 大容量ディレクトリ Top 5:"
sudo du -sh /var/lib/docker /var/log /home/ubuntu/hitoikiAPI /var/cache /usr 2>/dev/null | sort -hr | head -5
echo ""

# Dockerリソース使用量
echo "🐳 Docker リソース使用量:"
sudo docker system df
echo ""

# 推奨アクション
if [ $DISK_USAGE -ge $DISK_THRESHOLD ]; then
    echo "🔧 推奨クリーンアップアクション:"
    echo "1. ./cleanup.sh                    # 総合クリーンアップ"
    echo "2. sudo docker system prune -af   # Docker完全クリーンアップ"
    echo "3. sudo journalctl --vacuum-time=3d # ログ削除"
    echo ""
fi

# 自動クリーンアップの提案
if [ $DISK_USAGE -ge $CRITICAL_THRESHOLD ]; then
    echo "🤖 自動クリーンアップを実行しますか？ (y/N)"
    read -r response
    if [[ $response == "y" || $response == "Y" ]]; then
        echo "🚀 自動クリーンアップを開始..."
        ./cleanup.sh
    fi
fi

echo "===================="
echo "📈 監視完了"