import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdAccountCircle } from "react-icons/md";
import { FaCrown, FaHome, FaTimes, FaNewspaper } from "react-icons/fa";
import { FaArrowTrendUp } from "react-icons/fa6";
import { useAuth } from "../contexts/authContext";

interface SideMenuProps {
    viewMode?: 'latest' | 'ranking' | 'trend';
    onViewModeChange?: (mode: 'latest' | 'ranking' | 'trend') => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ 
    viewMode = 'latest', 
    onViewModeChange
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(window.innerWidth > 1024);
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
                    <div className="side-menu-header-content">
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
{/*                             
                            <button
                                className={`menu-link ${viewMode === 'ranking' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('ranking')}
                            >
                                <div className="menu-link-icon">
                                    <FaCrown size={18} />
                                </div>
                                <span className="menu-link-text">ランキング</span>
                            </button>
                            
                            <button
                                className={`menu-link ${viewMode === 'trend' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('trend')}
                            >
                                <div className="menu-link-icon">
                                    <FaArrowTrendUp size={18} />
                                </div>
                                <span className="menu-link-text">トレンド</span>
                            </button> */}
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
                </div>
            </nav>
        </>
    );
};

export default SideMenu;