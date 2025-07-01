import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import Showdown from "showdown";
import { API_BASE_URL } from '../config/api';
 
import { useAuth } from "../contexts/authContext";
import AuthModal from "../components/AuthModal";
import XLogo from "../assets/x-logo-black.png";
import ThreadsLogo from "../assets/threads-logo-black.svg";

interface Comment {
    id: number;
    username: string;
    user_id: number;
    comment: string;
    comment_likes: number;
    created_at: string;
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
    category?: string[];
    comment_count: number; // コメント数
}

// コメント投稿用のコンポーネントを作成
const CommentForm: React.FC<{ articleId: number; onCommentPosted: () => void; onAuthRequired: () => void; }> = ({
    articleId,
    onCommentPosted,
    onAuthRequired
}) => {
    const [comment, setComment] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isAuthenticated, user } = useAuth();

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isAuthenticated || !user?.id) {
            onAuthRequired();
            return;
        }
        
        if (!comment.trim()) {
            setError("コメントを入力してください");
            return;
        }

        if (comment.length > 500) {
            setError("コメントは500文字以内で入力してください");
            return;
        }
    
        try {
            setIsSubmitting(true);
            setError("");
            
            const response = await axios.post(`${API_BASE_URL}/articles/${articleId}/comments`, {
                user_id: user.id,
                comment: comment.trim(),
            });
            
            console.log("コメント投稿成功:", response.data);
            setComment("");
            onCommentPosted(); // 投稿後に親コンポーネントのリロード
        } catch (err) {
            console.error("コメント投稿失敗:", err);
            setError("コメントの投稿に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };    

    return (
        <div className="comment-form-container">
            <div className="comment-form-header">
                <h3 className="comment-form-title">💬 コメントを投稿する</h3>
                <p className="comment-form-subtitle">
                    {isAuthenticated ? 
                        `${user?.username || 'あなた'}としてコメントを投稿` : 
                        'ログインしてコメントを投稿しましょう'
                    }
                </p>
            </div>
            
            <form onSubmit={handleCommentSubmit} className="comment-form">
                <div className="comment-input-container">
                    <textarea
                        className="comment-textarea"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="この記事についてのあなたの感想や意見をお聞かせください..."
                        rows={4}
                        maxLength={500}
                        disabled={!isAuthenticated || isSubmitting}
                    />
                    <div className="comment-input-footer">
                        <span className="character-count">
                            {comment.length}/500
                        </span>
                        {!isAuthenticated && (
                            <span className="login-hint">
                                ログインが必要です
                            </span>
                        )}
                    </div>
                </div>
                
                {error && (
                    <div className="comment-error">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}
                
                <div className="comment-form-actions">
                    <button 
                        type="button" 
                        className="comment-cancel-button"
                        onClick={() => setComment("")}
                        disabled={!comment || isSubmitting}
                    >
                        クリア
                    </button>
                    <button 
                        type="submit" 
                        className="comment-submit-button"
                        disabled={!isAuthenticated || !comment.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading-spinner"></span>
                                投稿中...
                            </>
                        ) : (
                            <>
                                <span className="submit-icon">🚀</span>
                                コメント投稿
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};


const ArticleDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [article, setArticle] = useState<Article | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [, setPopupMessage] = useState<string | null>(null);
    const { isAuthenticated, user } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const navigate = useNavigate();

    const converter = new Showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
        ghCompatibleHeaderId: true,
        simpleLineBreaks: true,
        requireSpaceBeforeHeadingText: true,
        literalMidWordUnderscores: true,
        smoothLivePreview: true,
        emoji: true,
        underline: true,
        openLinksInNewWindow: true,
        backslashEscapesHTMLTags: true,
        disableForced4SpacesIndentedSublists: true,
        ghCodeBlocks: true,
        smartIndentationFix: true,
    });
    
    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
    };
    
    converter.addExtension({
        type: "output",
        regex: /<img src="(.*?)" alt="(.*?)"(.*?)>/g,
        replace: '<img src="$1" alt="$2" style="max-width:100%; max-height:300px; display:block; margin:10px auto;" $3 />'
    }, "imageResizer");
    
    converter.addExtension({
        type: "output",
        regex: /<video src="(.*?)"(.*?)>/g,
        replace: '<video src="$1" $2 style="max-width:100%; max-height:300px; display:block; margin:10px auto;"></video>'
    }, "videoResizer");    


    const fetchArticle = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/articles/${id}`);
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

    const handleCommentLike = async (commentId: number) => {
        if (!isAuthenticated || !user?.id) {
            setShowAuthModal(true);
            return;
        }
        try {
            const response = await axios.post(
                `${API_BASE_URL}/comments/${commentId}/like?user_id=${user.id}`,
                { user_id: user.id }
            );

            if (article) {
                setArticle({
                    ...article,
                    comments: article.comments.map((c) =>
                        c.id === commentId
                            ? { ...c, comment_likes: response.data.like_count }
                            : c
                    ),
                });
            }
        } catch (error) {
            console.error("コメントのいいねに失敗しました:", error);
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        try {
            // いいねボタンに特別なアニメーション効果を追加
            const likeButton = document.querySelector(".like-button") as HTMLElement;
            if (likeButton) {
                // 連続クリック防止
                likeButton.style.pointerEvents = "none";
                
                // 特別感のあるアニメーション
                likeButton.classList.add("liked");
                
                // ハートエフェクトを作成
                createHeartEffect(likeButton);
                
                // 振動効果（対応ブラウザのみ）
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
                
                setTimeout(() => {
                    likeButton.classList.remove("liked");
                    likeButton.style.pointerEvents = "auto";
                }, 800);
            }

            const response = await axios.post(`${API_BASE_URL}/articles/${article?.id}/like`);
            if (article) {
                setArticle({ ...article, like_count: response.data.like_count });
            }

            setPopupMessage("❤️ いいねしました！");
            setTimeout(() => setPopupMessage(null), 3000);
        } catch (error) {
            console.error("いいねに失敗しました:", error);
        }
    };

    // ハートエフェクトを作成する関数
    const createHeartEffect = (button: HTMLElement) => {
        const hearts = ['❤️', '💖', '💕', '💗', '💝'];
        const heartCount = 5;
        
        for (let i = 0; i < heartCount; i++) {
            const heart = document.createElement('div');
            heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.cssText = `
                position: absolute;
                font-size: 1.5rem;
                pointer-events: none;
                z-index: 1000;
                animation: heartFloat 2s ease-out forwards;
                left: ${button.offsetLeft + Math.random() * button.offsetWidth}px;
                top: ${button.offsetTop}px;
            `;
            
            // ランダムな方向に飛ばす
            const randomX = (Math.random() - 0.5) * 200;
            const randomY = -100 - Math.random() * 100;
            
            heart.style.setProperty('--random-x', `${randomX}px`);
            heart.style.setProperty('--random-y', `${randomY}px`);
            
            button.parentElement?.appendChild(heart);
            
            // アニメーション終了後に要素を削除
            setTimeout(() => {
                heart.remove();
            }, 2000);
        }
    };

    const handleCommentPosted = async () => {
        await fetchArticle();
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

    let rawHtml = converter.makeHtml(article.content);

    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
            "h1", "h2", "h3", "h4", "h5", "h6", "p", "br",
            "strong", "b", "em", "i", "del", "strike", "code",
            "blockquote", "pre", "ul", "ol", "li", "a", "img", 
            "video", "source"
        ],
        ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "controls", "style"]
    });

    return (
        <div className="article-detail">
            <div className="article-detail-header">
                <h1 className="article-title">{article.title}</h1>
                {article.category && article.category.length > 0 && (
                    <div className="article-categories">
                    {article.category.map((cat, index) => (
                        <span
                        key={index}
                        className="category-tag"
                        onClick={() => navigate(`/category/${encodeURIComponent(cat)}`)}
                        style={{ cursor: "pointer", color: "#3b82f6" }}
                        >
                        #{cat}
                        </span>
                    ))}
                    </div>
                )}
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
            </div>
            {isAuthenticated && article.user.id === user?.id && (
                <button
                    onClick={() => navigate(`/edit-article/${article.id}`)}
                    className="edit-button"
                >
                    ✏️ 編集
                </button>
            )}
            <div className="article-content">
                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                <div className="action-buttons">
                    <button className="like-button" onClick={handleLike}>
                        ❤️ <span className="like-count">{article?.like_count}</span>
                    </button>

                    <div className="share-buttons">
                        <p>この記事をシェアする:</p>

                        {/* X（旧Twitter） */}
                        <a
                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title + " #calime_news\n")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="share-icon"
                        >
                            <img src={XLogo} alt="Share on X" />
                        </a>

                        {/* Threads */}
                        <a
                            href={`https://www.threads.net/intent/post?text=${encodeURIComponent(article.title + " #calmie_news\n" + window.location.href)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="share-icon"
                        >
                            <img src={ThreadsLogo} alt="Share on Threads" />
                        </a>
                    </div>
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
                            <div className="comment-date">{formatDate(comment.created_at)}</div>
                            <div className="comment-body">{comment.comment}</div>
                            <div className="comment-footer">
                                👍 {comment.comment_likes}
                                <button onClick={() => handleCommentLike(comment.id)}>
                                    いいね
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>コメントがありません。</p>
                )}
            </div>
            <CommentForm articleId={article.id} onCommentPosted={handleCommentPosted} onAuthRequired={() => setShowAuthModal(true)} />

            <div className="recommendation-news">
                {article.user_articles && article.user_articles.length > 0 && (
                    <div className="user-articles-section">
                        <h3>このユーザーの他の記事</h3>
                        <div className="articles-list">
                            {article.user_articles.slice(0, 3).map((userArticle, index) => (
                                <div key={index} className="article-card" onClick={() => navigate(`/articles/${userArticle.id}`)}>
                                <div className="card-thumbnail">
                                    {userArticle.thumbnail_url ? (
                                        <img
                                            src={userArticle.thumbnail_url}
                                            alt={userArticle.title}
                                            className="thumbnail-image"
                                        />
                                    ) : (
                                        <div className="placeholder-thumbnail" />
                                    )}
                                </div>
                                <div className="card-content">
                                    <h2 className="article-title">
                                        {truncateText(userArticle.title, 25)}
                                    </h2>
                                    <div className="article-meta">
                                        <p>❤️ {userArticle.like_count}</p>
                                        <p>💬 {userArticle.comment_count}</p>
                                        <p>📅 {formatDate(userArticle.public_at)}</p>
                                        <p>👁️‍🗨️ {userArticle.access_count}</p>
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                )}
                {article.recommended_articles && article.recommended_articles.length > 0 && (
                    <div className="recommended-articles-section">
                        <h3>おすすめの記事</h3>
                        <div className="articles-list">
                            {article.recommended_articles.slice(0, 3).map((recArticle, index) => (
                                <div key={index} className="article-card" onClick={() => navigate(`/articles/${recArticle.id}`)}>
                                    <div className="card-thumbnail">
                                        {recArticle.thumbnail_url ? (
                                            <img
                                                src={recArticle.thumbnail_url}
                                                alt={recArticle.title}
                                                className="thumbnail-image"
                                            />
                                        ) : (
                                            <div className="placeholder-thumbnail" />
                                        )}
                                    </div>
                                    <div className="card-content">
                                        <h2 className="article-title">
                                            {truncateText(recArticle.title, 25)}
                                        </h2>
                                        <div className="article-meta">
                                            <p>❤️ {recArticle.like_count}</p>
                                            <p>💬 {recArticle.comment_count}</p>
                                            <p>📅 {formatDate(recArticle.public_at)}</p>
                                            <p>👁️‍🗨️ {recArticle.access_count}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showAuthModal && (
            <AuthModal isOpen={true} onClose={() => setShowAuthModal(false)} />
            )}
        </div>

    );
};

export default ArticleDetail;
