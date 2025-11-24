import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import Articles from "./Articles";
import ArticleDetail from "./ArticleDetail";
import Header from "./header";
import PostArticle from "./PostArticle";
import MyPage from "./Mypage";
import EditArticle from "./EditArticle";
import PrivacyPolicy from "./PrivacyPolicy";

const Index: React.FC = () => {
    const [viewMode, setViewMode] = useState<'latest' | 'ranking' | 'trend'>('latest');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const navigate = useNavigate();
    
    // 検索機能の実装
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        navigate("/");
    };

    const handleViewModeChange = (mode: 'latest' | 'ranking' | 'trend') => {
        setViewMode(mode);
        setSearchQuery(''); // 検索クエリをクリア
        navigate("/");
    };

    return (
        <div className="main-view">
            <Header />
            <SideMenu 
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onSearch={handleSearch}
            />
            <div className="main-container">
                <div className="center">
                    <Routes>
                        <Route path="/" element={<Articles viewMode={viewMode} searchQuery={searchQuery} />} />
                        <Route path="/articles/:id" element={<ArticleDetail />} />
                        <Route path="/post-article" element={<PostArticle />} />
                        <Route path="/edit-article/:articleId" element={<EditArticle />} />
                        <Route path="/category/:categoryName" element={<Articles viewMode={viewMode} searchQuery={searchQuery} />} />
                        <Route path="/mypage/:userId" element={<MyPage />} />
                        <Route path="/mypage" element={<MyPage />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default Index;