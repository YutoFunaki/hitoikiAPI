import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Articles from "./Articles"; 

interface Comment {
    username: string;
    user_id: number;
    comment: string;
    comment_likes: number;
}

interface User {
    id: number;
    username: string;
    user_icon: string;
    introduction_text: string;
}

interface Article {
    id: number;
    title: string;
    content: string;
    thumbnail_url?: string;
    like_count: number;
    access_count: number;
    public_at: string;
    comments: Comment[];
    user: User; // ユーザー情報
    user_articles: Article[]; // 同じユーザーの他の記事
    recommended_articles: Article[]; // おすすめ記事
}

// コメント投稿用のコンポーネントを作成
const CommentForm: React.FC<{ articleId: number; onCommentPosted: () => void }> = ({
    articleId,
    onCommentPosted,
}) => {
    const [comment, setComment] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment) {
            setError("コメントを入力してください");
            return;
        }
    
        try {
            const response = await axios.post(`http://localhost:8000/articles/${articleId}/comments`, {
                user_id: 1, // 仮のユーザーID。認証機能を統合する際に動的に設定
                comment,
            });
            console.log("コメント投稿成功:", response.data);
            setComment("");
            setError("");
            onCommentPosted(); // 投稿後に親コンポーネントのリロード
        } catch (err) {
            console.error("コメント投稿失敗:", err);
            setError("コメントの投稿に失敗しました");
        }
    };    

    return (
        <form onSubmit={handleCommentSubmit} className="comment-form">
            <div>
                <label>コメント</label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                ></textarea>
            </div>
            <button type="submit">投稿する</button>
            {error && <p className="error-message">{error}</p>}
        </form>
    );
};


const ArticleDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [article, setArticle] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [popupMessage, setPopupMessage] = useState<string | null>(null);

    const fetchArticle = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:8000/articles/${id}`);
            setArticle(response.data);
        } catch (err: any) {
            console.error("Failed to fetch data:", err);
            setError("記事の取得に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArticle();
    }, [id]);

    const formatDate = (date: string) => {
        const d = new Date(date);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d
            .getHours()
            .toString()
            .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    const handleLike = async () => {
        try {
            const likeButton = document.querySelector(".like-button");
            likeButton?.classList.add("like-animation");
            setTimeout(() => likeButton?.classList.remove("like-animation"), 300);

            const response = await axios.post(`http://localhost:8000/articles/${article?.id}/like`);
            if (article) {
                setArticle({ ...article, like_count: response.data.like_count });
            }

            // ポップアップメッセージを表示
            setPopupMessage("いいねしました！");
            setTimeout(() => setPopupMessage(null), 3000); // 3秒後に非表示
        } catch (error) {
            console.error("いいねに失敗しました:", error);
        }
    };

    const handleCommentPosted = async () => {
        await fetchArticle();
    };

    const handleShare = () => {
        const currentUrl = window.location.href;
        navigator.clipboard
            .writeText(currentUrl)
            .then(() => {
                setPopupMessage("記事のURLをコピーしました！");
                setTimeout(() => setPopupMessage(null), 3000);
            })
            .catch((error) => {
                console.error("URLのコピーに失敗しました:", error);
            });
    };

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>読み込んでいます...</p>
            </div>
        );
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    if (!article) {
        return <p>記事が見つかりません。</p>;
    }

    return (
        <div className="article-detail">
            <div className="article-detail-header">
                <h1 className="article-title">{article.title}</h1>
                <div className="article-detail-meta">
                    <div className="article-author">
                        <img
                            src={article.user.user_icon}
                            alt={`${article.user.username} のアイコン`}
                            className="author-icon"
                        />
                        <span className="author-name">{article.user.username}</span>
                    </div>
                    <div className="article-stats">
                        <span>❤️ {article.like_count} いいね</span>
                        <span>👁️‍🗨️ {article.access_count} 閲覧</span>
                        <span>📅 {formatDate(article.public_at)}</span>
                    </div>
                </div>
                {article.thumbnail_url && (
                    <div className="article-thumbnail-container">
                        <img
                            src={article.thumbnail_url}
                            alt={article.title}
                            className="article-thumbnail"
                        />
                    </div>
                )}
            </div>
            <div className="article-content">
                <p>{article.content}</p>
                <div className="action-buttons">
                    <button className="like-button" onClick={handleLike}>
                        ❤️ <span className="like-count">{article?.like_count}</span>
                    </button>
                    <button className="share-button" onClick={handleShare}>
                        🔗
                    </button>
                </div>
            </div>

            <div className="article-user-info">
                <h2>この記事を作成したユーザー</h2>
                <div className="user-info">
                    <img
                        src={article.user.user_icon}
                        alt={`${article.user.username} のアイコン`}
                        className="user-icon"
                    />
                    <div>
                        <p><strong>{article.user.username}</strong></p>
                        <p>{article.user.introduction_text}</p>
                    </div>
                </div>
            </div>

            <div className="comments-section">
                <h2>コメント</h2>
                {article.comments.length > 0 ? (
                    article.comments.map((comment, index) => (
                        <div key={index} className="comment-card">
                            <div className="comment-header">
                                <strong>{comment.username}</strong>
                            </div>
                            <div className="comment-body">{comment.comment}</div>
                            <div className="comment-footer">👍 {comment.comment_likes} いいね</div>
                        </div>
                    ))
                ) : (
                    <p>コメントがありません。</p>
                )}
            </div>
            <CommentForm articleId={article.id} onCommentPosted={handleCommentPosted} />

            <div className="recommendation-news">
                {article.user_articles && article.user_articles.length > 0 && (
                    <Articles articles={article.user_articles} title="このユーザーの他の記事" />
                )}
                {article.recommended_articles && article.recommended_articles.length > 0 && (
                    <Articles articles={article.recommended_articles} title="おすすめの記事" />
                )}
            </div>

        </div>
    );
};

export default ArticleDetail;
