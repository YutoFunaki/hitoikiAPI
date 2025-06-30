import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal"; 
import { useAuth } from "../contexts/authContext";
import { FaSearch, FaChevronLeft, FaChevronRight, FaHeart, FaTimes } from "react-icons/fa";

const RightSidebar: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(window.innerWidth > 960);
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);

    const handlePostButtonClick = () => {
        if (isAuthenticated) {
          navigate("/post-article");
        } else {
          setAuthModalOpen(true);
        }
    };

    const handleCategoryClick = (category: string) => {
        setSearchQuery(category);
        onSearch(category);
    };

    // ウィンドウサイズ変更時に開閉状態を自動調整
    useEffect(() => {
        const handleResize = () => {
            setIsOpen(window.innerWidth > 960);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const calmieCategories = [
        { name: "🐱 猫", emoji: "🐱", query: "猫" },
        { name: "🐶 犬", emoji: "🐶", query: "犬" },
        { name: "👶 赤ちゃん", emoji: "👶", query: "赤ちゃん" },
        { name: "🐰 うさぎ", emoji: "🐰", query: "うさぎ" },
        { name: "🐼 パンダ", emoji: "🐼", query: "パンダ" },
        { name: "🦊 キツネ", emoji: "🦊", query: "キツネ" },
        { name: "🌸 癒し", emoji: "🌸", query: "癒し" },
        { name: "😊 笑顔", emoji: "😊", query: "笑顔" },
    ];

    return (
        <>
            {/* トグルボタン */}
            <button className="right-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaChevronRight /> : <FaChevronLeft />}
            </button>

            {/* 右側コンテンツ */}
            <div className={`right-container ${isOpen ? "open" : "closed"}`}>
                {/* サイドバーヘッダー（閉じるボタン付き） */}
                <div className="right-sidebar-header">
                    <h2 className="sidebar-main-title">🌟 calmie</h2>
                    <button 
                        className="right-close-button"
                        onClick={() => setIsOpen(false)}
                        aria-label="サイドバーを閉じる"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* 検索バー */}
                <div className="search-bar">
                    <div className="search-input-wrapper">
                        <input
                            className="search-input"
                            type="text"
                            placeholder="🔍 癒しの記事を探してみませんか？"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && onSearch(searchQuery)}
                        />
                        <button className="search-button" onClick={() => onSearch(searchQuery)}>
                            <FaSearch /> 検索
                        </button>
                    </div>
                </div>

                {/* サイドバーコンテンツ */}
                <div className="sidebar-content">
                    {/* 癒しのカテゴリ */}
                    <div className="trending-section">
                        <h3 className="sidebar-title">カテゴリ</h3>
                        <div className="trending-tags">
                            {calmieCategories.map((category) => (
                                <button
                                    key={category.query}
                                    className="trending-tag pulsing-element"
                                    onClick={() => handleCategoryClick(category.query)}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 投稿するボタン（常に表示） */}
            <button className="post-article-button floating-element" onClick={handlePostButtonClick}>
                ✏️ 
            </button>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
};

export default RightSidebar;