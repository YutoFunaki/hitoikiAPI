import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import Articles from "./Articles";
import ArticleDetail from "./ArticleDetail";
import Header from "./header";
import PostArticle from "./PostArticle";
import RightSidebar from "./RightSidebar";
import axios from "axios";
import MyPage from "./Mypage";
import EditArticle from "./EditArticle";

interface Article {
    id: number;
    title: string;
    thumbnail_url?: string;
    like_count: number;
    comment_count: number;
    access_count: number;
    public_at: string;
    category?: string[];
}

const Index: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
    const [articlesTitle, setArticlesTitle] = useState("最新の記事");
    const [viewMode, setViewMode] = useState<'latest' | 'ranking' | 'trend'>('latest');
    const navigate = useNavigate();
    // HTTPSではなくHTTPを使用
    const API_BASE_URL = "http://localhost:8000";

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                setLoading(true);
                setError("");
                console.log("Fetching articles from:", API_BASE_URL);
                const response = await axios.get(`${API_BASE_URL}/articles`);
                setArticles(response.data);
                setFilteredArticles(response.data);
            } catch (err) {
                console.error("Failed to fetch articles:", err);
                // calmieのコンセプトに合わせた癒しのダミーデータ
                const dummyArticles: Article[] = [
                    {
                        id: 1,
                        title: "🐱 子猫の寝顔が可愛すぎる！リラックス効果抜群の癒し動画",
                        thumbnail_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop",
                        like_count: 1247,
                        comment_count: 89,
                        access_count: 15600,
                        public_at: new Date().toISOString(),
                        category: ["動物", "猫", "癒し"]
                    },
                    {
                        id: 2,
                        title: "👶 赤ちゃんの初めての笑顔を捉えた瞬間！心が温かくなる写真集",
                        thumbnail_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop",
                        like_count: 892,
                        comment_count: 156,
                        access_count: 8900,
                        public_at: new Date(Date.now() - 86400000).toISOString(),
                        category: ["赤ちゃん", "笑顔", "癒し"]
                    },
                    {
                        id: 3,
                        title: "🐕 保護犬が新しい家族と出会った瞬間の感動シーン",
                        thumbnail_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=300&fit=crop",
                        like_count: 2156,
                        comment_count: 234,
                        access_count: 23400,
                        public_at: new Date(Date.now() - 172800000).toISOString(),
                        category: ["動物", "犬", "感動"]
                    },
                    {
                        id: 4,
                        title: "🌸 桜の下で遊ぶ子猫たちの春の風景",
                        thumbnail_url: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400&h=300&fit=crop",
                        like_count: 1567,
                        comment_count: 98,
                        access_count: 18900,
                        public_at: new Date(Date.now() - 259200000).toISOString(),
                        category: ["動物", "猫", "春", "癒し"]
                    },
                    {
                        id: 5,
                        title: "🦊 キツネの親子の愛情あふれる日常",
                        thumbnail_url: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&h=300&fit=crop",
                        like_count: 987,
                        comment_count: 67,
                        access_count: 12300,
                        public_at: new Date(Date.now() - 345600000).toISOString(),
                        category: ["動物", "キツネ", "家族", "癒し"]
                    },
                    {
                        id: 6,
                        title: "🐰 うさぎの赤ちゃんたちのお昼寝タイム",
                        thumbnail_url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&h=300&fit=crop",
                        like_count: 734,
                        comment_count: 45,
                        access_count: 9800,
                        public_at: new Date(Date.now() - 432000000).toISOString(),
                        category: ["動物", "うさぎ", "癒し"]
                    },
                    {
                        id: 7,
                        title: "🐼 パンダの赤ちゃんが初めて竹を食べる瞬間",
                        thumbnail_url: "https://images.unsplash.com/photo-1539681944080-d63d2ad9f92b?w=400&h=300&fit=crop",
                        like_count: 1876,
                        comment_count: 203,
                        access_count: 28900,
                        public_at: new Date(Date.now() - 518400000).toISOString(),
                        category: ["動物", "パンダ", "成長"]
                    },
                    {
                        id: 8,
                        title: "🌻 ひまわり畑で遊ぶ子犬たちの夏の思い出",
                        thumbnail_url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop",
                        like_count: 1234,
                        comment_count: 87,
                        access_count: 16700,
                        public_at: new Date(Date.now() - 604800000).toISOString(),
                        category: ["動物", "犬", "夏", "自然"]
                    }
                ];
                setArticles(dummyArticles);
                setFilteredArticles(dummyArticles);
                // setError("🌟 現在サーバーメンテナンス中です。癒しのサンプル記事をお楽しみください。");
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    // 検索用のカテゴリ記事コンポーネント（簡略化）
    const CategoryArticles: React.FC = () => {
        return <Articles viewMode={viewMode} />;
    };

    // 検索機能の実装
    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setFilteredArticles(articles);
            setArticlesTitle("最新の記事");
            navigate("/");
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/search`, {
                params: { query }
            });
            setFilteredArticles(response.data);
            setArticlesTitle(`🔍 検索結果: 「${query}」`);
            navigate("/");
        } catch (err) {
            // ローカル検索にフォールバック
            const filtered = articles.filter((article: Article) => 
                article.title.toLowerCase().includes(query.toLowerCase()) ||
                article.category?.some((cat: string) => cat.toLowerCase().includes(query.toLowerCase()))
            );
            setFilteredArticles(filtered);
            setArticlesTitle(`🔍 検索結果: 「${query}」`);
            navigate("/");
        }
    };

    const handleViewModeChange = (mode: 'latest' | 'ranking' | 'trend') => {
        setViewMode(mode);
        navigate("/");
    };

    if (loading && articles.length === 0) {
        return (
            <div className="main-view">
                <Header />
                <SideMenu 
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                />
                <div className="main-container">
                    <div className="center">
                        <div className="loading-screen">
                            <div className="spinner" />
                            <p>🌸 心温まる記事を読み込んでいます...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-view">
            <Header />
            <SideMenu 
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
            />
            <div className="main-container">
                <div className="center">
                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <Routes>
                        <Route path="/" element={<Articles viewMode={viewMode} />} />
                        <Route path="/articles/:id" element={<ArticleDetail />} />
                        <Route path="/post-article" element={<PostArticle />} />
                        <Route path="/edit-article/:articleId" element={<EditArticle />} />
                        <Route path="/category/:categoryName" element={<CategoryArticles />} />
                        <Route path="/mypage/:userId" element={<MyPage />} />
                    </Routes>
                </div>
                <RightSidebar onSearch={handleSearch} />
            </div>
        </div>
    );
};

export default Index;