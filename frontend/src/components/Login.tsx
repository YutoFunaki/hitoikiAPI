import axios from "axios";
import React, { useState } from "react";

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Login with:", email, password);
        // ログイン処理を追加
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
        </div>
    );
};

export default Login;
