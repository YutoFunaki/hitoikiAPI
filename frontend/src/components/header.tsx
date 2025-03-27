import React, { useState, useEffect } from "react";

const Header: React.FC = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 960);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (!isMobile) return null; // 1024px以上では表示しない

    return (
        <header className="mobile-header">
            <h1 className="header-title">calmie</h1>
        </header>
    );
};

export default Header;