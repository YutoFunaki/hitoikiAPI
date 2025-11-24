# 🚀 Calmie運用ガイド

## 📋 日常運用フロー

### 1️⃣ 開発環境での作業
```bash
# ローカル開発環境を起動
cd ~/hitoikiAPI/hitoikiAPI/services/calmie
./start.sh dev

# 開発サーバーでテスト
# フロントエンド: http://localhost:3000 
# バックエンド: http://localhost:8001
# pgAdmin: http://localhost:8080
```

### 2️⃣ コード修正・テスト
```bash
# バックエンド修正時
# → ホットリロードで即座に反映（Docker restart不要）

# フロントエンド修正時  
# → Vite開発サーバーで即座に反映

# データベース操作
# → pgAdmin (http://localhost:8080) でGUI操作
```

### 3️⃣ 本番デプロイ
```bash
# 変更をコミット
git add .
git commit -m "機能改善: ○○を修正"
git push origin main

# 本番サーバーで軽量デプロイ
ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181
cd ~/hitoikiAPI/services/calmie
./deploy.sh  # 30秒で完了
```

## 🔧 運用シナリオ別対応

### 🐛 緊急バグ修正
```bash
# 最速対応（10秒で修正）
ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181
cd ~/hitoikiAPI/services/calmie
nano backend/app/main.py  # 直接編集
docker compose restart calmie-backend  # 即座に反映
```

### 🎨 フロントエンド更新
```bash
# 自動検出対応
./deploy.sh  # フロントエンド変更を自動検出してビルド
```

### 📦 依存関係更新
```bash
# フルリビルド必要時のみ
./start.sh prod  # 約3-5分
```

### 🔍 ログ確認
```bash
# リアルタイムログ監視
docker compose logs -f

# 特定サービスのみ
docker compose logs -f calmie-backend
docker compose logs -f calmie-frontend
```

## 🚨 トラブルシューティング

### サービス停止時
```bash
./stop.sh   # 全サービス停止
./start.sh prod  # 再起動
```

### データベース問題
```bash
# pgAdminでGUI確認: http://52.70.99.181:8080
# ユーザー: admin@calmie.com
# パスワード: admin
```

### Nginx設定変更
```bash
sudo nano /etc/nginx/sites-available/calmie.jp
sudo nginx -t  # 設定チェック
sudo systemctl reload nginx
```

## 📊 監視・メンテナンス

### 定期確認項目
- [ ] サービス稼働状況: `docker compose ps`
- [ ] ディスク容量: `df -h`
- [ ] ログファイルサイズ: `du -sh /var/log/nginx/`
- [ ] SSL証明書期限: 自動更新（Let's Encrypt）

## 🔐 セキュリティ管理

### Firebase認証ファイル
- 場所: `/home/ubuntu/hitoikiAPI/services/calmie/backend/app/firebase/`
- バックアップ済み
- 定期的な更新不要（長期間有効）

### SSH接続
```bash
# 安全な接続方法
ssh -i ~/Desktop/ダウンロード/calmie.pem ubuntu@52.70.99.181
```