#!/bin/bash

# 🧹 Calmie ディスククリーンアップスクリプト
# 不要なファイルやDockerデータを安全に削除

echo "🧹 ディスククリーンアップを開始..."
echo "======================================="

# 開始前のディスク使用量を表示
echo "📊 クリーンアップ前のディスク使用量:"
df -h / | grep -v Filesystem
echo ""

# Docker関連のクリーンアップ
echo "🐳 Dockerクリーンアップ..."

# 使用されていないイメージを削除
echo "🗂️  未使用Dockerイメージを削除:"
REMOVED_IMAGES=$(sudo docker image prune -f 2>&1)
if [[ $REMOVED_IMAGES == *"Total reclaimed space"* ]]; then
    echo "$REMOVED_IMAGES"
else
    echo "削除するイメージなし"
fi

# ビルドキャッシュを削除
echo ""
echo "🏗️  Dockerビルドキャッシュを削除:"
BUILD_CACHE=$(sudo docker builder prune -f 2>&1)
if [[ $BUILD_CACHE == *"Total reclaimed space"* ]]; then
    echo "$BUILD_CACHE"
else
    echo "削除するキャッシュなし"
fi

# 未使用ボリュームを削除（注意: データ保持確認）
echo ""
echo "📦 未使用Dockerボリュームを削除:"
REMOVED_VOLUMES=$(sudo docker volume prune -f 2>&1)
if [[ $REMOVED_VOLUMES == *"Total reclaimed space"* ]]; then
    echo "$REMOVED_VOLUMES"
else
    echo "削除するボリュームなし"
fi

# システムログのクリーンアップ
echo ""
echo "📄 システムログをクリーンアップ..."

# journal ログを1週間以内に制限
echo "🗞️  Journalログを1週間分に制限:"
sudo journalctl --vacuum-time=7d
echo "✅ Journalログクリーンアップ完了"

# 古いNginxログを圧縮
echo ""
echo "🌐 Nginxログを管理:"
if [ -f "/var/log/nginx/access.log" ]; then
    NGINX_SIZE_BEFORE=$(sudo du -sh /var/log/nginx/ | cut -f1)
    # 7日以上前のログを削除
    sudo find /var/log/nginx/ -name "*.log.*" -mtime +7 -delete 2>/dev/null
    NGINX_SIZE_AFTER=$(sudo du -sh /var/log/nginx/ | cut -f1)
    echo "Nginxログ: $NGINX_SIZE_BEFORE → $NGINX_SIZE_AFTER"
else
    echo "Nginxログなし"
fi

# APTキャッシュクリーンアップ
echo ""
echo "📦 APTキャッシュをクリーンアップ:"
APT_CLEANED=$(sudo apt-get clean 2>&1)
sudo apt-get autoremove -y >/dev/null 2>&1
echo "✅ APTキャッシュクリーンアップ完了"

# 一時ファイルクリーンアップ
echo ""
echo "🗑️  一時ファイルをクリーンアップ:"
TEMP_SIZE_BEFORE=$(sudo du -sh /tmp 2>/dev/null | cut -f1 || echo "0")
sudo find /tmp -type f -mtime +2 -delete 2>/dev/null
TEMP_SIZE_AFTER=$(sudo du -sh /tmp 2>/dev/null | cut -f1 || echo "0")
echo "一時ファイル: $TEMP_SIZE_BEFORE → $TEMP_SIZE_AFTER"

# 最終結果表示
echo ""
echo "======================================="
echo "✅ クリーンアップ完了！"
echo ""
echo "📊 クリーンアップ後のディスク使用量:"
df -h / | grep -v Filesystem
echo ""
echo "🐳 Docker使用量:"
sudo docker system df
echo ""
echo "💡 定期実行推奨: 週1回このスクリプトを実行"
echo "⚠️  ディスク使用量80%を超える前に実行してください"