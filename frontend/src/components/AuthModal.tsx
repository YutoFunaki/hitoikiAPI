import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { auth } from "../firebase";

const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isLoginMode) {
        // ログイン処理
        const res = await axios.post("http://localhost:8000/login", {
          email,
          password,
        });
        login(res.data.token);
        localStorage.setItem("userId", res.data.user.id);
        onClose();
      } else {
        // 新規登録処理
        const res = await axios.post("http://localhost:8000/register", {
          email,
          password,
          username,
        });
        login(res.data.token);
        localStorage.setItem("userId", res.data.user.id);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "エラーが発生しました");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await axios.post("http://localhost:8000/oauth-login", {
        id_token: idToken,
      });

      login(res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      onClose();
    } catch (err) {
      console.error("Googleログイン失敗:", err);
      setError("Googleログインに失敗しました");
    }
  };

  return (
    <div className="auth-modal-overlay" style={overlayStyle}>
      <div className="auth-modal-content" style={modalStyle}>
        <h2>{isLoginMode ? "ログイン" : "新規登録"}</h2>
        <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "1rem" }}>
            ※ Googleログインとメールアドレスでのログインは別アカウントとして扱われる可能性があります。
        </p>
        <form onSubmit={handleSubmit}>
          {!isLoginMode && (
            <input
              type="text"
              placeholder="ユーザー名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>
            {isLoginMode ? "ログイン" : "登録"}
          </button>
        </form>

        <p style={{ textAlign: "center", margin: "1rem 0" }}>または</p>

        <button onClick={handleGoogleLogin} style={googleButtonStyle}>
          Googleでログイン
        </button>

        <p style={{ marginTop: "1rem", color: "#888", fontSize: "0.9rem" }}>
          {isLoginMode ? "アカウントをお持ちでないですか？" : "すでにアカウントをお持ちですか？"}{" "}
          <span
            onClick={() => setIsLoginMode(!isLoginMode)}
            style={{ color: "#3b82f6", cursor: "pointer" }}
          >
            {isLoginMode ? "新規登録はこちら" : "ログインはこちら"}
          </span>
        </p>

        {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

        <button onClick={onClose} style={{ marginTop: "1rem", color: "#555" }}>
          閉じる
        </button>
      </div>
    </div>
  );
};

export default AuthModal;

// スタイル定義
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: React.CSSProperties = {
  background: "white",
  padding: "2rem",
  borderRadius: "8px",
  width: "90%",
  maxWidth: "400px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  textAlign: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  margin: "0.5rem 0",
  border: "1px solid #ccc",
  borderRadius: "4px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#3b82f6",
  color: "white",
  border: "none",
  padding: "0.5rem",
  borderRadius: "4px",
  cursor: "pointer",
};

const googleButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#ea4335",
};