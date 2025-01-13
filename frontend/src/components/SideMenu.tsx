import React from "react";
import { useNavigate } from "react-router-dom";
import { MdAccountCircle } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import { FaHome } from "react-icons/fa";
import { FaArrowTrendUp } from "react-icons/fa6";
import axios from "axios";

const SideMenu: React.FC = () => {
    const navigate = useNavigate();

    const handleLinkClick = async (path: string) => {
        try {
            // GETリクエストを送信
            await axios.get(`http://localhost:8000${path}`);
            // リクエスト成功後にナビゲーション
            navigate(path);
        } catch (err) {
            console.error("GET request failed:", err);
        }
    };

    return (
        <div className="side-menu">
            <button className="menu-link" onClick={() => handleLinkClick("/")}>
                <FaHome size={30} />
                <span>ホーム</span>
            </button>
            <button className="menu-link" onClick={() => handleLinkClick("/ranking")}>
                <FaCrown size={30} />
                <span>ランキング</span>
            </button>
            <button className="menu-link" onClick={() => handleLinkClick("/trend")}>
                <FaArrowTrendUp size={30} />
                トレンド
            </button>
            <button className="menu-link" onClick={() => handleLinkClick("/mypage")}>
                <MdAccountCircle size={30} />
                <span>マイページ</span>
            </button>
        </div>
    );
};

export default SideMenu;

// 色リスト
// #765e5e
// #64765e
// #5e7576
// #5e6076
// #6d5e76
// #765e6f