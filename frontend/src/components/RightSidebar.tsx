import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaCode, FaBusinessTime, FaLeaf, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const RightSidebar: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(window.innerWidth > 960); // 初期状態をPCで開いた状態にする
    const navigate = useNavigate();

    // ウィンドウサイズ変更時に開閉状態を自動調整
    useEffect(() => {
        const handleResize = () => {
            setIsOpen(window.innerWidth > 960);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <>
            {/* トグルボタン */}
            <button className="right-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaChevronRight /> : <FaChevronLeft />}
            </button>

            {/* 右側コンテンツ */}
            <div className={`right-container ${isOpen ? "open" : "closed"}`}>
                {/* 検索バー */}
                <div className="search-bar">
                    <input
                        className="search-input"
                        type="text"
                        placeholder="タイトル、カテゴリ、記事内単語"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="search-button" onClick={() => onSearch(searchQuery)}>
                        <FaSearch /> 検索
                    </button>
                </div>

                {/* トレンドカテゴリ */}
                {/* <div className="trend-category">
                    <h3>トレンドカテゴリ</h3>
                    <ul>
                        <li><FaCode /> 技術</li>
                        <li><FaBusinessTime /> ビジネス</li>
                        <li><FaLeaf /> ライフスタイル</li>
                    </ul>
                </div> */}
            </div>

            {/* 投稿するボタン（常に表示） */}
            <button className="post-article-button" onClick={() => navigate("/post-article")}>
                ✏️ 
            </button>
        </>
    );
};

export default RightSidebar;