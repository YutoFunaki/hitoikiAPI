import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Index from "./components/Index";

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={<Index />} /> {/* Index内でさらにルーティング */}
            </Routes>
        </Router>
    );
};

export default App;
