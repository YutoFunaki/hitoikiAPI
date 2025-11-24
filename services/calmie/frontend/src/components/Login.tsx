import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import { API_BASE_URL } from '../config/api';

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const response = await axios.post(`${API_BASE_URL}/login`, {
                email: email, // 修正: email フィールドを送信
                password: password
            });

            const { token, user } = response.data;
            
            // AuthContextのlogin関数を使用して認証状態を設定
            login(token, user);

            // ログイン後にホームページにリダイレクト
            navigate("/");
        } catch (err: any) {
            // エラーが配列の場合、最初のメッセージを抽出
            const errorMsg = Array.isArray(err.response?.data?.detail)
                ? err.response.data.detail[0].msg
                : err.response?.data?.detail || "ログインに失敗しました";
            setError(errorMsg);
        }
    };

    return (
        <div>
            <h3>ログイン</h3>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">ログイン</button>
            </form>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default Login;