import os
from firebase_admin import credentials, initialize_app, _apps
from dotenv import load_dotenv

# .env を読み込む
load_dotenv(dotenv_path=".env.production")

# Docker環境とローカル環境の両方をサポートするパス設定
def get_firebase_cred_path():
    # 試行するパスのリスト
    candidate_paths = [
        # 環境変数から取得
        os.getenv("FIREBASE_CREDENTIAL_PATH"),
        # Docker環境のパス（WORKDIR /app から）
        "/app/app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-bf68272980.json",
        # ローカル環境のパス（相対パス）
        "./app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-bf68272980.json",
        # 絶対パスでも試行
        os.path.join(os.path.dirname(__file__), "firebase", "hitoiki-app-firebase-adminsdk-xn0xn-bf68272980.json")
    ]
    
    # 存在するパスを順番に確認
    for path in candidate_paths:
        if path and os.path.exists(path):
            print(f"✅ Firebase credential file found: {path}")
            return path
    
    print(f"❌ Firebase credential file not found in any of these paths:")
    for path in candidate_paths:
        if path:
            print(f"  - {path} (exists: {os.path.exists(path)})")
    
    return None

firebase_cred_path = get_firebase_cred_path()

# 初期化（ファイルが存在しない場合はスキップ）
if not _apps:
    try:
        if firebase_cred_path and os.path.exists(firebase_cred_path):
            cred = credentials.Certificate(firebase_cred_path)
            initialize_app(cred)
            print("✅ Firebase initialized successfully")
        else:
            print("⚠️ Firebase credential file not found. Running without Firebase authentication.")
            print(f"Expected path: {firebase_cred_path}")
            print(f"Current working directory: {os.getcwd()}")
            print(f"File exists check: {os.path.exists(firebase_cred_path)}")
            # Firebase無しでも動作するようにダミーの初期化
            initialize_app(options={'projectId': 'hitoiki-app'})
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("🔄 Running without Firebase authentication.")
        # エラーが発生してもアプリケーションを継続
        try:
            initialize_app(options={'projectId': 'hitoiki-app'})
        except:
            pass
