import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import ArticleCard from "./ArticleCard";
import { useAuth } from "../contexts/authContext";
import { API_BASE_URL } from '../config/api';

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

interface Stats {
  total_articles: number;
  total_likes: number;
  total_access: number;
  total_comments: number;
  member_since: string;
}

interface MyPageData {
  user: {
    id: number;
    username: string;
    user_icon: string;
    introduction_text: string;
    display_name?: string;
    email?: string;
  };
  articles: Article[];
  stats: Stats;
}

const MyPage: React.FC = () => {
  const { user, login, isAuthenticated } = useAuth();
  const [data, setData] = useState<MyPageData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [editedIntro, setEditedIntro] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'likes' | 'history'>('articles');

  // メモ化された記事リスト
  const memoizedArticles = useMemo(() => {
    return data?.articles || [];
  }, [data?.articles]);

  useEffect(() => {
    // 認証状態が初期化中の場合は待機
    if (isAuthenticated === undefined) {
      return;
    }
    
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }
    
    const apiUrl = `${API_BASE_URL}/mypage/${user.id}`;
    const token = localStorage.getItem('token');
    
    // 認証ヘッダーを含めてリクエスト送信
    const config = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};
    
    axios
      .get(apiUrl, config)
      .then((res) => {
        setData(res.data);
        setEditedUsername(res.data.user.username);
        setEditedIntro(res.data.user.introduction_text || "");
      })
      .catch((err) => {
        console.error("MyPage API Error:", err.response?.status, err.response?.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id, isAuthenticated]);

  const handleSave = async () => {
    if (!user) return;
    const formData = new FormData();
    formData.append("username", editedUsername);
    formData.append("introduction_text", editedIntro);
    if (selectedFile) formData.append("user_icon", selectedFile);
  
    try {
      await axios.post(`${API_BASE_URL}/mypage/${user.id}`, formData);
  
      const res = await axios.get(`${API_BASE_URL}/mypage/${user.id}`);
      setData(res.data);
      setEditedUsername(res.data.user.username);
      setEditedIntro(res.data.user.introduction_text || "");
      setSelectedFile(null);
      setEditing(false);

      // 🔁 ローカルストレージとAuthContextを更新
      const updatedUser = {
        ...user,
        username: res.data.user.username,
        user_icon: res.data.user.user_icon,
        introduction_text: res.data.user.introduction_text,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(localStorage.getItem("token") || "", updatedUser);
    } catch (err) {
      console.error("❌ プロフィール更新失敗:", err);
    }
  };

  // 認証状態初期化中
  if (isAuthenticated === undefined) {
    return (
      <div className="mypage-loading">
        <div className="loading-spinner"></div>
        <p>認証状態を確認中...</p>
      </div>
    );
  }

  // 未認証ユーザー
  if (!isAuthenticated) {
    return (
      <div className="mypage-error">
        <h2>🔒 ログインが必要です</h2>
        <p>マイページを表示するにはログインしてください。</p>
        <button onClick={() => window.location.href = '/login'}>ログインページへ</button>
      </div>
    );
  }

  // データ読み込み中
  if (loading) {
    return (
      <div className="mypage-loading">
        <div className="loading-spinner"></div>
        <p>マイページを読み込み中...</p>
      </div>
    );
  }

  // データ取得失敗
  if (!data) {
    return (
      <div className="mypage-error">
        <h2>😔 データの取得に失敗しました</h2>
        <p>マイページの情報を読み込むことができませんでした。</p>
        <button onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }

  return (
    <div className="mypage-container">
      {/* ヘッダーセクション */}
      <div className="mypage-header">
        <div className="profile-section">
          <div className="profile-avatar">
            <img
              src={data.user.user_icon || '/cat_icon.png'}
              alt="プロフィール画像"
              className="avatar-image"
            />
            {editing && (
              <div className="avatar-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setSelectedFile(e.target.files ? e.target.files[0] : null)
                  }
                  id="avatar-input"
                />
                <label htmlFor="avatar-input" className="upload-button">
                  📷 変更
                </label>
              </div>
            )}
          </div>

          <div className="profile-info">
            {editing ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  placeholder="ユーザー名"
                  className="edit-input"
                />
                <textarea
                  value={editedIntro}
                  onChange={(e) => setEditedIntro(e.target.value)}
                  placeholder="自己紹介文を入力してください..."
                  className="edit-textarea"
                  rows={4}
                />
                <div className="edit-actions">
                  <button onClick={handleSave} className="save-button">
                    ✅ 保存
                  </button>
                  <button onClick={() => setEditing(false)} className="cancel-button">
                    ❌ キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-display">
                <h1 className="username">{data.user.username}</h1>
                <p className="introduction">
                  {data.user.introduction_text || "自己紹介文はまだ設定されていません。"}
                </p>
                <p className="member-since">📅 {data.stats.member_since}からのメンバー</p>
                <button onClick={() => setEditing(true)} className="edit-button">
                  ✏️ プロフィール編集
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 統計情報 */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-number">{data.stats.total_articles}</div>
            <div className="stat-label">投稿記事</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{data.stats.total_likes}</div>
            <div className="stat-label">総いいね数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{data.stats.total_access}</div>
            <div className="stat-label">総アクセス数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{data.stats.total_comments}</div>
            <div className="stat-label">総コメント数</div>
          </div>
        </div>
      </div>

      {/* タブセクション */}
      <div className="mypage-tabs">
        <button
          className={`tab-button ${activeTab === 'articles' ? 'active' : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          📝 投稿記事 ({data.stats.total_articles})
        </button>
        <button
          className={`tab-button ${activeTab === 'likes' ? 'active' : ''}`}
          onClick={() => setActiveTab('likes')}
        >
          ❤️ いいねした記事
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📖 閲覧履歴
        </button>
      </div>

      {/* コンテンツセクション */}
      <div className="mypage-content">
        {activeTab === 'articles' && (
          <div className="articles-section">
            <h2>投稿記事一覧</h2>
            {memoizedArticles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>まだ記事を投稿していません</h3>
                <p>あなたの最初の記事を投稿してみませんか？</p>
                <button 
                  className="post-button"
                  onClick={() => window.location.href = '/post-article'}
                >
                  ✨ 記事を投稿する
                </button>
              </div>
            ) : (
              <div className="articles-grid">
                {memoizedArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="likes-section">
            <div className="empty-state">
              <div className="empty-icon">❤️</div>
              <h3>いいねした記事</h3>
              <p>いいねした記事がここに表示されます。</p>
              <p className="note">※この機能は近日中に実装予定です</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <h3>閲覧履歴</h3>
              <p>閲覧した記事の履歴がここに表示されます。</p>
              <p className="note">※この機能は近日中に実装予定です</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;
