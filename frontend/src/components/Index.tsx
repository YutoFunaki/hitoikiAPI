import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import Articles from "./Articles";
import ArticleDetail from "./ArticleDetail";
import PostArticle from "./PostArticle";
import axios from "axios";

const Index: React.FC = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState(""); // 検索クエリ
    const [filteredArticles, setFilteredArticles] = useState([]); // 検索後の記事
    const navigate = useNavigate();

    useEffect(() => {
        // 最新記事を取得
        const fetchArticles = async () => {
            try {
                const response = await axios.get("http://localhost:8000/");
                setArticles(response.data); // データを状態にセット
                setFilteredArticles(response.data); // 初期状態をすべて表示
            } catch (err) {
                setError("記事の取得に失敗しました。");
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    // 検索機能の実装
    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setFilteredArticles(articles); // 検索文字列が空ならすべて表示
        } else {
            const filtered = articles.filter((article: any) =>
                article.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredArticles(filtered);
        }
    };

    // 記事投稿ページへの遷移
    const handleNavigateToPost = () => {
        navigate("/post-article"); // 記事投稿ページへ遷移
    };

    return (
        <div className="main-view">
            <SideMenu />
            <div className="main-container">
                <div className="center">
                    <Routes>
                        {/* 最新の記事一覧 */}
                        <Route
                            path="/"
                            element={
                                <Articles
                                    articles={filteredArticles} // 検索後の記事データを渡す
                                    title="最新の記事"
                                />
                            }
                        />
                        {/* 記事詳細 */}
                        <Route path="/article/:id" element={<ArticleDetail />} />
                        {/* 記事投稿ページ */}
                        <Route path="/post-article" element={<PostArticle />} />
                    </Routes>
                </div>
                <div className="right-container">
                    <h2 className="section-title">右側コンテンツ</h2>
                    {/* 検索バー */}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="記事を検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button onClick={handleSearch}>検索</button>
                    </div>
                    {/* トレンドカテゴリ */}
                    <div className="trend-category">
                        <h3>トレンドカテゴリ</h3>
                        <ul>
                            <li>技術</li>
                            <li>ビジネス</li>
                            <li>ライフスタイル</li>
                        </ul>
                    </div>
                    {/* 記事投稿ボタン */}
                    <div className="post-article">
                        <button onClick={handleNavigateToPost}>記事を投稿する</button>
                    </div>
                </div>
            </div>
            {loading && <p>読み込み中...</p>}
            {error && <p>{error}</p>}
        </div>
    );
};

export default Index;