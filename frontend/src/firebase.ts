// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBxbeYImDYJ9lHIWfL-P1dh_c5budaIEB4",
  authDomain: "hitoiki-app.firebaseapp.com",
  projectId: "hitoiki-app", // バックエンドと一致
  storageBucket: "hitoiki-app.appspot.com",
  messagingSenderId: "670782940710",
  appId: "1:670782940710:web:calmie",
};

const app = initializeApp(firebaseConfig); // ✅ ここで初期化
export const auth = getAuth(app); // 他のファイルでも使えるように export