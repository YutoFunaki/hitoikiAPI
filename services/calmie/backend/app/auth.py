from fastapi import HTTPException
from firebase_admin import auth

# トークンを検証する関数
def verify_token(token: str):
    try:
        # Firebaseトークンをデコード
        decoded_token = auth.verify_id_token(token)
        print(f"Decoded token: {decoded_token}")  # トークン情報をログに記録
        return decoded_token  # デコードされたトークン情報
    except Exception as e:
        print(f"Token verification error: {e}")  # エラーの詳細を記録
        raise HTTPException(status_code=401, detail="Invalid token")
    

def generate_test_token(uid: str = "NPNqYgs0tOPtTEb805z3Xvcw21E2"):
    try:
        # Firebase UID を使ってカスタムトークンを作成
        custom_token = auth.create_custom_token(uid)
        print(f"Generated custom token: {custom_token.decode('utf-8')}")
        return custom_token.decode("utf-8")
    except Exception as e:
        print(f"Error generating custom token: {e}")
        return None

