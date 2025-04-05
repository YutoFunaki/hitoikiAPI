import React from "react";
import { Link } from "react-router-dom";

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

interface ArticleCardProps {
    article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
    const formatDate = (date: string) => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}(${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}) ${d
            .getHours()
            .toString()
            .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
    };

    return (
        <Link to={`/article/${article.id}`} className="article-card-link">
            <div className="article-card">
                <div className="card-thumbnail">
                    {article.thumbnail_url ? (
                        <img
                            src={article.thumbnail_url}
                            alt={article.title}
                            className="thumbnail-image"
                        />
                    ) : (
                        <div className="placeholder-thumbnail" />
                    )}
                </div>
                <div className="card-content">
                    <h2 className="article-title">
                        {truncateText(article.title, 25)}
                    </h2>
                    <div className="article-meta">
                        <p>❤️ {article.like_count}</p>
                        <p>💬 {article.comment_count}</p>
                        <p>📅 {formatDate(article.public_at)}</p>
                        <p>👁️‍🗨️ {article.access_count}</p>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ArticleCard;
