import React from "react";
import ArticleCard from "./ArticleCard";

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

interface ArticlesProps {
    articles: Article[]; // 表示する記事リストを引数で渡す
    title: string; // セクションのタイトル
}

const Articles: React.FC<ArticlesProps> = ({ articles, title }) => {
    return (
        <div className="articles-container">
            <h2 className="section-title">{title}</h2>
            {articles && articles.length > 0 ? (
                articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                ))
            ) : (
                <p>記事がありません。</p>
            )}
        </div>
    );
};

export default Articles;
