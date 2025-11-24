import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from '../config/api';

interface Article {
    id: number;
    title: string;
    content?: string;
    thumbnail_image?: string;
    thumbnail_url?: string;
    category?: string[];
    username?: string;
    likes_count?: number;
    access_count?: number;
    comment_count?: number;
    created_at?: string;
    public_at?: string;
    rank?: number;
    score?: number;
    recent_likes?: number;
    recent_comments?: number;
    total_access?: number;
    trend_score?: number;
}

interface ArticlesResponse {
    articles: Article[];
    period?: string;
}

interface ArticlesProps {
    viewMode?: 'latest' | 'ranking' | 'trend';
    searchQuery?: string;
}

const Articles: React.FC<ArticlesProps> = ({ 
    viewMode = 'latest',
    searchQuery
}) => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rankingPeriod, setRankingPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [trendPeriod] = useState<'hourly'>('hourly');



    const fetchArticles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let url = `${API_BASE_URL}/articles`;
            let params = new URLSearchParams();
            
            if (searchQuery && searchQuery.trim()) {
                // 検索モード
                url = `${API_BASE_URL}/search`;
                params.append('query', searchQuery.trim());
            } else if (viewMode === 'ranking') {
                url = `${API_BASE_URL}/articles/ranking/${rankingPeriod}`;
            } else if (viewMode === 'trend') {
                url = `${API_BASE_URL}/articles/trend/${trendPeriod}`;
            }

            const fullUrl = params.toString() ? `${url}?${params}` : url;
            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data: ArticlesResponse | Article[] = await response.json();
            
            // レスポンスの形式を統一
            if (Array.isArray(data)) {
                setArticles(data);
            } else {
                setArticles(data.articles || []);
            }
        } catch (error) {
            console.error("記事取得エラー:", error);
            setError("記事の取得に失敗しました");
            
            // 検索時のフォールバック
            if (searchQuery && searchQuery.trim()) {
                const dummyResults = [
                    {
                        id: 1,
                        title: `🔍 「${searchQuery}」に関連する癒しの記事`,
                        thumbnail_image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop",
                        likes_count: 45,
                        access_count: 120,
                        comment_count: 12,
                        category: ["検索", "癒し"],
                        username: "検索結果",
                        public_at: new Date().toISOString()
                    }
                ];
                setArticles(dummyResults);
            } else {
                setArticles([]);
            }
        } finally {
            setLoading(false);
        }
    }, [viewMode, rankingPeriod, trendPeriod, searchQuery]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const getViewModeTitle = () => {
        if (searchQuery && searchQuery.trim()) {
            return `検索結果: 「${searchQuery}」`;
        }
        
        switch (viewMode) {
            case 'ranking':
                return `ランキング (${rankingPeriod === 'daily' ? '日次' : rankingPeriod === 'weekly' ? '週次' : '月次'})`;
            case 'trend':
                return `トレンド (${trendPeriod === 'hourly' ? '1時間' : ''}以内)`;
            default:
                return '最新記事';
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '';
        }
    };

    const renderArticleStats = (article: Article) => {
        if (viewMode === 'ranking') {
            return (
                <div className="article-stats">
                    {article.rank && (
                        <span className="rank-badge">#{article.rank}</span>
                    )}
                    <span className="stat-item">
                        👍 {article.likes_count || 0}
                    </span>
                    <span className="stat-item">
                        👀 {article.access_count || 0}
                    </span>
                    <span className="stat-item">
                        📊 {article.score || 0}pt
                    </span>
                </div>
            );
        } else if (viewMode === 'trend') {
            return (
                <div className="article-stats">
                    {article.rank && (
                        <span className="rank-badge trend">#{article.rank}</span>
                    )}
                    <span className="stat-item">
                        🔥 {article.recent_likes || 0}
                    </span>
                    <span className="stat-item">
                        💬 {article.recent_comments || 0}
                    </span>
                    <span className="stat-item">
                        📈 {article.trend_score || 0}pt
                    </span>
                </div>
            );
        } else {
            return (
                <div className="article-meta">
                    <p>❤️ {article.likes_count || 0}</p>
                    <p>💬 {article.comment_count || 0}</p>
                    <p>📅 {formatDate(article.public_at)}</p>
                    <p>👁️‍🗨️ {article.access_count || 0}</p>
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>記事を読み込んでいます...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-message">
                <p>{error}</p>
                <button onClick={fetchArticles}>再試行</button>
            </div>
        );
    }

    return (
        <div className="articles-container">
            <div className="articles-header">
                <h2 className="section-title">{getViewModeTitle()}</h2>
                
                {/* ランキング期間選択タブ */}
                {viewMode === 'ranking' && (
                    <div className="period-tabs">
                        <button 
                            className={`period-tab ${rankingPeriod === 'daily' ? 'active' : ''}`}
                            onClick={() => setRankingPeriod('daily')}
                        >
                            📅 日次
                        </button>
                        <button 
                            className={`period-tab ${rankingPeriod === 'weekly' ? 'active' : ''}`}
                            onClick={() => setRankingPeriod('weekly')}
                        >
                            📆 週次
                        </button>
                        <button 
                            className={`period-tab ${rankingPeriod === 'monthly' ? 'active' : ''}`}
                            onClick={() => setRankingPeriod('monthly')}
                        >
                            🗓️ 月次
                        </button>
                    </div>
                )}
                
                <p className="articles-count">
                    {articles.length}件の記事
                </p>
            </div>

            {articles.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3 className="empty-text">記事がありません</h3>
                    <p className="empty-subtext">
                        {viewMode === 'ranking' ? 'ランキングデータがまだありません' : 
                         viewMode === 'trend' ? 'トレンドデータがまだありません' : 
                         '記事がまだ投稿されていません'}
                    </p>
                </div>
            ) : (
                <div className="articles-grid">
                    {articles.map((article) => (
                        <Link 
                            key={article.id} 
                            to={`/articles/${article.id}`} 
                            className="article-card-link"
                        >
                            <article className="article-card">
                                <div className="card-thumbnail">
                                    {article.thumbnail_image || article.thumbnail_url ? (
                                        <img 
                                            src={article.thumbnail_image || article.thumbnail_url} 
                                            alt={article.title}
                                            className="thumbnail-image"
                                        />
                                    ) : (
                                        <div className="placeholder-thumbnail">
                                            <span>🖼️</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="card-content">
                                    <div className="card-header">
                                        <h3 className="article-title">{article.title}</h3>
                                        
                                        {article.category && article.category.length > 0 && (
                                            <div className="article-categories">
                                                {article.category.slice(0, 3).map((cat, index) => (
                                                    <span key={index} className="category-tag">
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="article-meta">
                                        {renderArticleStats(article)}
                                        
                                        <div className="meta-info">
                                            {article.username && (
                                                <span className="meta-item">
                                                    👤 {article.username}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Articles;
