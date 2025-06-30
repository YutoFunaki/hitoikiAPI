import React, { useState } from "react";
import axios from "axios";
import { PREFECTURES } from "../config/prefectures";

const Register: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [prefectures, setPrefectures] = useState<number | "">("");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const API_BASE_URL = "http://localhost:8000";

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        try {
            const response = await axios.post(`${API_BASE_URL}/register`, {
                email,
                password,
                username,
                prefectures: prefectures || null,
            });
            setSuccess(`登録が成功しました: ${response.data.message}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || "登録に失敗しました");
        }
    };

    return (
        <div>
            <h2>新規登録</h2>
            <form onSubmit={handleRegister}>
                <div>
                    <label htmlFor="username">ユーザー名</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="email">メールアドレス</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">パスワード</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="prefectures">都道府県</label>
                    <select
                        id="prefectures"
                        value={prefectures}
                        onChange={(e) => setPrefectures(e.target.value ? Number(e.target.value) : "")}
                        required
                    >
                        <option value="">都道府県を選択</option>
                        {Object.entries(PREFECTURES).map(([id, name]) => (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit">登録</button>
            </form>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}
        </div>
    );
};

export default Register;
