import os
from firebase_admin import credentials, initialize_app, _apps, auth
from dotenv import load_dotenv

# .env を読み込む（存在する場合のみ）
if os.path.exists(".env.production"):
    load_dotenv(dotenv_path=".env.production")
elif os.path.exists(".env"):
    load_dotenv(dotenv_path=".env")

# Firebase認証ファイルのパス検索
def get_firebase_cred_path():
    candidate_paths = [
        # 環境変数から取得
        os.getenv("FIREBASE_CREDENTIAL_PATH"),
        # Docker環境のパス
        "/app/app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-b53b0762f9.json",
        # ローカル環境のパス
        "./app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-b53b0762f9.json",
        # 絶対パス
        os.path.join(os.path.dirname(__file__), "firebase", "hitoiki-app-firebase-adminsdk-xn0xn-b53b0762f9.json")
    ]
    
    for path in candidate_paths:
        if path and os.path.exists(path):
            print(f"✅ Firebase credential file found: {path}")
            return path
    
    print("❌ Firebase credential file not found.")
    print("📋 Expected locations:")
    for i, path in enumerate(candidate_paths, 1):
        if path:
            exists_status = "✅ EXISTS" if os.path.exists(path) else "❌ NOT FOUND"
            print(f"  {i}. {path} - {exists_status}")
    
    return None

firebase_cred_path = get_firebase_cred_path()

# Firebase初期化
firebase_app = None
firebase_auth = None

if not _apps:
    try:
        if firebase_cred_path:
            cred = credentials.Certificate(firebase_cred_path)
            firebase_app = initialize_app(cred)
            firebase_auth = auth
            print("✅ Firebase Admin SDK initialized successfully")
        else:
            print("⚠️  Firebase credential file not found. Authentication will be disabled.")
            # 開発用の最小設定
            firebase_app = initialize_app(options={'projectId': 'hitoiki-app'})
            print("⚠️  Running in development mode without authentication")
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        firebase_app = None
        firebase_auth = None

def is_firebase_available():
    """Firebase認証が利用可能かチェック"""
    return firebase_auth is not None and firebase_cred_path is not None
