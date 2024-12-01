import axios from "axios";
import React, { useState } from "react";

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { email, password };
            console.log("Sending payload:", payload);

            const response = await axios.post("http://localhost:8000/login", payload, {
                headers: { "Content-Type": "application/json" },
            });
            console.log("Login successful:", response.data);
        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err.response?.data?.detail || "An error occurred.");
        }
    };

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default Login;
