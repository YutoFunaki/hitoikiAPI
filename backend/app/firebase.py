import os
from firebase_admin import credentials, initialize_app, _apps
from dotenv import load_dotenv

# .env を読み込む
load_dotenv(dotenv_path=".env.production")

# パスを取得
firebase_cred_path = os.getenv("FIREBASE_CREDENTIAL_PATH")

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
            # Firebase無しでも動作するようにダミーの初期化
            initialize_app(options={'projectId': 'dummy-project'})
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("🔄 Running without Firebase authentication.")
        # エラーが発生してもアプリケーションを継続
        try:
            initialize_app(options={'projectId': 'dummy-project'})
        except:
            pass
