import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:
    cred = credentials.Certificate("/app/app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-bf68272980.json")
    firebase_admin.initialize_app(cred)
