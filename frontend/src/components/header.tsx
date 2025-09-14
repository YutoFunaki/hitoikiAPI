import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 960);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleTitleClick = () => {
        navigate("/");
    };

    if (!isMobile) return null; // 1024px以上では表示しない

    return (
        <header className="mobile-header">
            <h1 
                className="header-title clickable-title" 
                onClick={handleTitleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleTitleClick();
                    }
                }}
            >
                calmie
            </h1>
        </header>
    );
};

export default Header;