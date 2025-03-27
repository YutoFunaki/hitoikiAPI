import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdAccountCircle } from "react-icons/md";
import { FaCrown, FaHome } from "react-icons/fa";
import { FaArrowTrendUp } from "react-icons/fa6";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const SideMenu: React.FC = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(window.innerWidth > 1024);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const handleResize = () => {
            setIsOpen(window.innerWidth > 1024);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <>
            <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? "✖" : "☰"}
            </button>
            <div className={`side-menu ${isOpen ? "open" : "closed"}`}>
                <button className="menu-link" onClick={() => navigate("/")}>
                    <FaHome size={30} />
                    <span>ホーム</span>
                </button>
                <button className="menu-link" onClick={() => navigate("/ranking")}>
                    <FaCrown size={30} />
                    <span>ランキング</span>
                </button>
                <button className="menu-link" onClick={() => navigate("/trend")}>
                    <FaArrowTrendUp size={30} />
                    <span>トレンド</span>
                </button>
                {isAuthenticated && (
                    <button className="menu-link" onClick={() => navigate("/mypage")}>
                        <MdAccountCircle size={30} />
                        <span>マイページ</span>
                    </button>
                )}
            </div>
        </>
    );
};

export default SideMenu;