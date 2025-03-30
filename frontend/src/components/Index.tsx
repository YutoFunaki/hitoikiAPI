import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import Articles from "./Articles";
import ArticleDetail from "./ArticleDetail";
import Header from "./Header";
import PostArticle from "./PostArticle";
import RightSidebar from "./RightSidebar";
import axios from "axios";
import MyPage from "./MyPage";
import EditArticle from "./EditArticle";

const Index: React.FC = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [articlesTitle, setArticlesTitle] = useState("最新の記事"); // タイトル用ステート追加
    const navigate = useNavigate();

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await axios.get("http://localhost:8000/");
                setArticles(response.data);
                setFilteredArticles(response.data);
            } catch (err) {
                setError("記事の取得に失敗しました。");
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    const CategoryArticles: React.FC = () => {
        const { categoryName } = useParams();
        const [categoryArticles, setCategoryArticles] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState("");
    
        useEffect(() => {
            const fetchByCategory = async () => {
                try {
                    const response = await axios.get(`http://localhost:8000/articles/search?category=${encodeURIComponent(categoryName || "")}`);
                    setCategoryArticles(response.data);
                } catch (err) {
                    setError("カテゴリ記事の取得に失敗しました。");
                } finally {
                    setLoading(false);
                }
            };
            fetchByCategory();
        }, [categoryName]);
    
        if (loading) return <p>読み込み中...</p>;
        if (error) return <p>{error}</p>;
    
        return (
            <Articles
                articles={categoryArticles}
                title={`カテゴリ: #${categoryName}`}
            />
        );
    };
    

    // 検索機能の実装
    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setFilteredArticles(articles);
            setArticlesTitle("最新の記事"); // 検索が空ならタイトルをリセット
            navigate("/");
            return;
        }

        try {
            const response = await axios.get(`http://localhost:8000/search`, {
                params: { query }
            });
            setFilteredArticles(response.data);
            setArticlesTitle(`検索結果: 「${query}」`); // タイトルを検索結果に更新
            navigate("/"); // 検索後にメインページに戻る
        } catch (err) {
            setError("検索に失敗しました。");
        }
    };

    return (
        <div className="main-view">
            <Header />
            <SideMenu />
            <div className="main-container">
                <div className="center">
                    <Routes>
                        <Route
                            path="/"
                            element={<Articles articles={filteredArticles} title={articlesTitle} />}
                        />
                        <Route path="/article/:id" element={<ArticleDetail />} />
                        <Route path="/post-article" element={<PostArticle />} />
                        <Route path="/edit-article/:id" element={<EditArticle />} />
                        <Route path="/category/:categoryName" element={<CategoryArticles />} />
                        <Route path="/mypage" element={<MyPage />} />
                    </Routes>
                </div>
                <RightSidebar onSearch={handleSearch} />
            </div>
            {loading && <p>読み込み中...</p>}
            {error && <p>{error}</p>}
        </div>
    );
};

export default Index;