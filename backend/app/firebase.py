import os
from firebase_admin import credentials, initialize_app, _apps
from dotenv import load_dotenv

# .env を読み込む
load_dotenv()

# パスを取得
firebase_cred_path = os.getenv("FIREBASE_CREDENTIAL_PATH")

# 初期化
if not _apps:
    cred = credentials.Certificate(firebase_cred_path)
    initialize_app(cred)
