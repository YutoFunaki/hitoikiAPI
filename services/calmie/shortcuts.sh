#!/bin/bash

# 🎯 Calmie開発ショートカットコマンド集

# 使用方法:
# source shortcuts.sh
# または
# echo "source ~/hitoikiAPI/hitoikiAPI/services/calmie/shortcuts.sh" >> ~/.bashrc

# === 開発環境管理 ===
alias calmie-dev='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && ./start.sh dev'
alias calmie-prod='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && ./start.sh prod'
alias calmie-stop='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && ./stop.sh'
alias calmie-restart='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && ./stop.sh && ./start.sh dev'

# === ログ確認 ===
alias calmie-logs='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && docker compose logs -f'
alias calmie-logs-backend='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && docker compose logs -f calmie-backend-dev'
alias calmie-logs-frontend='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && docker compose logs -f calmie-frontend-dev'

# === 状態確認 ===
alias calmie-status='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && docker compose ps'
alias calmie-health='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && ./health-check.sh'

# === データベース ===
alias calmie-db='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && docker compose exec postgres-dev psql -U postgres'
alias calmie-migrate='cd ~/hitoikiAPI/hitoikiAPI/services/calmie && docker compose exec calmie-backend-dev alembic upgrade head'

# === 本番管理 ===
alias calmie-deploy='ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181 "cd ~/hitoikiAPI/services/calmie && ./deploy.sh"'
alias calmie-server='ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181'
alias calmie-backup='ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181 "cd ~/hitoikiAPI/services/calmie && ./backup.sh"'
alias calmie-cleanup='ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181 "cd ~/hitoikiAPI/services/calmie && ./cleanup.sh"'

# === Git操作 ===
alias calmie-commit='cd ~/hitoikiAPI/hitoikiAPI && git add . && git commit'
alias calmie-push='cd ~/hitoikiAPI/hitoikiAPI && git push origin main'
alias calmie-pull='cd ~/hitoikiAPI/hitoikiAPI && git pull origin main'

# === 開発ワークフロー ===
calmie-quick-deploy() {
    if [ -z "$1" ]; then
        echo "使用方法: calmie-quick-deploy \"コミットメッセージ\""
        return 1
    fi
    
    cd ~/hitoikiAPI/hitoikiAPI
    git add .
    git commit -m "$1"
    git push origin main
    
    echo "🚀 本番デプロイを開始..."
    ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181 "cd ~/hitoikiAPI/services/calmie && ./deploy.sh"
}

# === 便利な開発関数 ===
calmie-hotfix() {
    if [ -z "$1" ]; then
        echo "使用方法: calmie-hotfix \"修正内容\""
        return 1
    fi
    
    echo "🔥 緊急修正モード: $1"
    ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181 "cd ~/hitoikiAPI && git pull origin main && cd services/calmie && docker compose restart calmie-backend"
}

calmie-dev-setup() {
    echo "🎯 Calmie開発環境セットアップ中..."
    cd ~/hitoikiAPI/hitoikiAPI/services/calmie
    
    # 開発環境起動
    ./start.sh dev
    
    # 数秒待機
    sleep 3
    
    # 状態確認
    docker compose ps
    
    echo "✅ 開発環境セットアップ完了！"
    echo "🌐 フロントエンド: http://localhost:3000"
    echo "🔗 バックエンドAPI: http://localhost:8001"
    echo "📊 pgAdmin: http://localhost:8080"
}

# ヘルプ表示
calmie-help() {
    echo "🎯 Calmie開発ショートカット一覧"
    echo "=================================="
    echo ""
    echo "📂 環境管理:"
    echo "  calmie-dev          # 開発環境起動"
    echo "  calmie-prod         # 本番環境起動"
    echo "  calmie-stop         # 環境停止"
    echo "  calmie-restart      # 環境再起動"
    echo "  calmie-dev-setup    # 開発環境完全セットアップ"
    echo ""
    echo "📋 状態確認:"
    echo "  calmie-status       # コンテナ状態"
    echo "  calmie-health       # ヘルスチェック"
    echo "  calmie-logs         # 全ログ表示"
    echo "  calmie-logs-backend # バックエンドログ"
    echo ""
    echo "🗄️  データベース:"
    echo "  calmie-db           # PostgreSQL接続"
    echo "  calmie-migrate      # マイグレーション実行"
    echo ""
    echo "🚀 デプロイ:"
    echo "  calmie-deploy                    # 本番デプロイ"
    echo "  calmie-quick-deploy \"メッセージ\" # コミット→デプロイ"
    echo "  calmie-hotfix \"修正内容\"        # 緊急修正"
    echo ""
    echo "🛠️  サーバー管理:"
    echo "  calmie-server       # サーバーSSH接続"
    echo "  calmie-backup       # バックアップ実行"
    echo "  calmie-cleanup      # ディスククリーンアップ"
    echo ""
    echo "💡 使用例:"
    echo "  calmie-quick-deploy \"ボタンデザイン修正\""
    echo "  calmie-hotfix \"URLバグ修正\""
    echo "  calmie-dev-setup"
}

# 初回実行時にヘルプを表示
echo "🎯 Calmie開発ショートカット読み込み完了！"
echo "💡 calmie-help でコマンド一覧を表示"