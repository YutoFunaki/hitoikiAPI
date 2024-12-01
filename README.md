# hitoikiAPI

# **hitoikiAPI**

このプロジェクトは、**React (TypeScript)** を使用したフロントエンドと **FastAPI** を使用したバックエンドで構成されており、**Firebase** による認証機能と **PostgreSQL** を採用しています。Docker を利用して開発・デプロイ環境を簡略化しています。

---

## **📂 ファイル構成**

hitoikiAPI/ ├── backend/ # バックエンドのコード │ ├── app/ # FastAPI アプリケーション │ │ ├── main.py # エントリーポイント │ │ ├── models.py # SQLAlchemyモデル定義 │ │ ├── database.py # データベース接続設定 │ │ ├── firebase.py # Firebaseの初期化処理 │ │ ├── auth.py # 認証関連のロジック │ │ ├── schemas.py # リクエスト/レスポンスのスキーマ定義 │ │ └── routers/ # ルーティングを分割するディレクトリ │ │ ├── articles.py # 記事関連のAPI │ │ └── users.py # ユーザー関連のAPI │ ├── Dockerfile # バックエンド用のDockerfile │ └── requirements.txt # Python依存関係 ├── frontend/ # フロントエンドのコード │ ├── src/ # ソースコード │ │ ├── App.tsx # Reactのエントリーポイント │ │ ├── index.tsx # ReactDOMのレンダリング設定 │ │ ├── components/ # UIコンポーネント │ │ │ ├── Login.tsx # ログインフォーム │ │ │ └── Register.tsx # ユーザー登録フォーム │ │ └── api.tsx # APIリクエスト関連 │ ├── public/ # 静的ファイル │ ├── package.json # フロントエンドの依存関係 │ └── vite.config.ts # Viteの設定 ├── docker-compose.yml # Docker構成ファイル └── README.md # このファイル

markdown
Copy code

---

## **📜 プロジェクト概要**

### **バックエンド**
- **FastAPI**:
  - 高速で直感的なAPIフレームワーク。
  - Firebaseを用いたユーザー認証。
  - PostgreSQLを使用したデータ永続化。
- **主要ディレクトリ/ファイル**:
  - `main.py`: APIのエントリーポイント。
  - `auth.py`: Firebase認証ロジック。
  - `routers/`: APIのルーティング定義。

### **フロントエンド**
- **React (TypeScript)**:
  - コンポーネントベースのフロントエンド開発。
  - Firebaseトークンを利用した認証。
- **主要ディレクトリ/ファイル**:
  - `components/Login.tsx`: ログインフォームコンポーネント。
  - `components/Register.tsx`: 登録フォームコンポーネント。
  - `api.tsx`: バックエンドとのAPI通信を管理。

### **Docker**
- **docker-compose.yml**:
  - PostgreSQLコンテナとFastAPIコンテナを統合。
  - 開発・デプロイ環境を簡略化。

---

## **🔒 重要情報の管理**
- **秘密鍵**や**環境変数**は `.env` ファイルで管理しています。
  - `backend/.env`: Firebase認証情報やDB接続情報を記載。
  - `.gitignore` に `.env` を追加し、リポジトリにプッシュされないように設定。

---

## **🚀 開発環境のセットアップ**

1. **リポジトリをクローン**:
   ```bash
   git clone https://github.com/your-repository/hitoikiAPI.git
   cd hitoikiAPI
Docker環境を構築:

bash
Copy code
docker-compose up --build
フロントエンドを起動:

bash
Copy code
cd frontend
npm install
npm run dev
バックエンドを起動:

Dockerが起動中であれば、FastAPIはhttp://localhost:8000で動作。
認証情報を設定:

Firebase管理画面からserviceAccountKey.jsonを取得し、backend/app/firebase/に配置。
less
Copy code
