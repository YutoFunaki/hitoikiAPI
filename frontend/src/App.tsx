import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Articles from "./components/Articles";

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/articles" element={<Articles />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Login />} />
                
            </Routes>
        </Router>
    );
};

export default App;
