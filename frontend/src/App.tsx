import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Index from "./components/Index";
import { AuthProvider } from "./contexts/AuthContext";

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={<Index />} /> {/* Index内でさらにルーティング */}
            </Routes>
            </AuthProvider>
        </Router>
    );
};

export default App;
