import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdAccountCircle } from "react-icons/md";
import { FaHome, FaTimes, FaNewspaper, FaSearch } from "react-icons/fa";
import { useAuth } from "../contexts/authContext";
import AuthModal from "../components/AuthModal";

interface SideMenuProps {
    viewMode?: 'latest' | 'ranking' | 'trend';
    onViewModeChange?: (mode: 'latest' | 'ranking' | 'trend') => void;
    onSearch?: (query: string) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ 
    viewMode = 'latest', 
    onViewModeChange,
    onSearch
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(window.innerWidth > 1024);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const handleResize = () => {
            setIsOpen(window.innerWidth > 1024);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleNavigation = (path: string) => {
        navigate(path);
        if (window.innerWidth <= 1024) {
            setIsOpen(false);
        }
    };

    const handleOverlayClick = () => {
        if (window.innerWidth <= 1024) {
            setIsOpen(false);
        }
    };

    const isActiveRoute = (path: string) => {
        return location.pathname === path;
    };

    const handleViewModeChange = (mode: 'latest' | 'ranking' | 'trend') => {
        if (onViewModeChange) {
            onViewModeChange(mode);
        }
        if (window.innerWidth <= 1024) {
            setIsOpen(false);
        }
    };

    const handleSearch = () => {
        if (onSearch && searchQuery.trim()) {
            onSearch(searchQuery);
        }
    };

    const handlePostButtonClick = () => {
        if (isAuthenticated) {
          navigate("/post-article");
        } else {
          setAuthModalOpen(true);
        }
    };

    const calmieCategories = [
        { name: "🐱 猫", query: "猫" },
        { name: "🐶 犬", query: "犬" },
        { name: "👶 赤ちゃん", query: "赤ちゃん" },
        { name: "🐰 うさぎ", query: "うさぎ" },
        { name: "🐢 亀", query: "亀" },
        { name: "🐹 ハムスター", query: "ハムスター" },
    ];

    const handleCategoryClick = (category: string) => {
        setSearchQuery(category);
        if (onSearch) {
            onSearch(category);
        }
    };

    return (
        <>
            {/* モバイル用オーバーレイ */}
            <div 
                className={`side-menu-overlay ${isOpen ? "open" : ""}`}
                onClick={handleOverlayClick}
                aria-hidden="true"
            />
            
            <button 
                className="menu-toggle" 
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
                aria-expanded={isOpen}
            >
                {isOpen ? <FaTimes size={20} /> : <FaHome size={20} />}
            </button>
            
            <nav className={`side-menu ${isOpen ? "open" : "closed"}`} role="navigation">
                <div className="side-menu-header">
                    <div 
                        className="side-menu-header-content clickable-header" 
                        onClick={() => handleNavigation('/')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleNavigation('/');
                            }
                        }}
                    >
                        <h1 className="side-menu-title">calmie</h1>
                        <p className="side-menu-subtitle">カルミー</p>
                    </div>
                    {/* モバイル用閉じるボタン */}
                    <button 
                        className="mobile-close-button"
                        onClick={() => setIsOpen(false)}
                        aria-label="メニューを閉じる"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>
                
                <div className="side-menu-content">
                    {/* 検索バー */}
                    <div className="menu-section">
                        <h3 className="menu-section-title">🔍 検索</h3>
                        <div className="search-bar">
                            <div className="search-input-wrapper">
                                <input
                                    className="search-input"
                                    type="text"
                                    placeholder="記事を探す"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button className="search-button" onClick={handleSearch}>
                                    <FaSearch />
                                </button>
                            </div>
                        </div>
                        
                        {/* カテゴリタグ */}
                        <div className="category-tags">
                            {calmieCategories.map((category) => (
                                <button
                                    key={category.query}
                                    className="category-tag"
                                    onClick={() => handleCategoryClick(category.query)}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* メインナビゲーション */}
                    <div className="menu-section">
                        <h3 className="menu-section-title">📰 記事</h3>
                        <div className="view-mode-menu">
                            <button
                                className={`menu-link ${viewMode === 'latest' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('latest')}
                            >
                                <div className="menu-link-icon">
                                    <FaNewspaper size={18} />
                                </div>
                                <span className="menu-link-text">新着記事</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* アカウントメニュー */}
                    {isAuthenticated && (
                        <div className="menu-section">
                            <h3 className="menu-section-title">👤 アカウント</h3>
                            <button
                                className={`menu-link ${isActiveRoute('/mypage') ? 'active' : ''}`}
                                onClick={() => handleNavigation('/mypage')}
                                aria-current={isActiveRoute('/mypage') ? 'page' : undefined}
                            >
                                <div className="menu-link-icon">
                                    <MdAccountCircle size={18} />
                                </div>
                                <span className="menu-link-text">マイページ</span>
                            </button>
                        </div>
                    )}
                    
                    {/* フッターメニュー */}
                    <div className="menu-section">
                        <button
                            className={`menu-link ${isActiveRoute('/privacy-policy') ? 'active' : ''}`}
                            onClick={() => handleNavigation('/privacy-policy')}
                            aria-current={isActiveRoute('/privacy-policy') ? 'page' : undefined}
                        >
                            <span className="menu-link-text" style={{ fontSize: '0.9rem', opacity: 0.8 }}>プライバシーポリシー</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* 投稿するボタン（フローティング） */}
            <button className="post-article-button floating-element" onClick={handlePostButtonClick}>
                ✏️ 
            </button>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
};

export default SideMenu;