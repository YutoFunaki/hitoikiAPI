import React, { useEffect, useState } from "react";
import axios from "axios";
import ArticleCard from "./ArticleCard"; // adjust path as necessary
import { useAuth } from "../contexts/authContext";

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

const MyPage: React.FC = () => {
  const { user, login } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [editedIntro, setEditedIntro] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    if (!user?.id) return;
    
    axios
      .get(`${API_BASE_URL}/mypage/${user.id}`)
      .then((res) => {
        setEditedUsername(res.data.user.username);
        setEditedIntro(res.data.user.introduction_text || "");
        setArticles(res.data.articles);
      })
      .catch((err) => console.error("❌ APIエラー:", err))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    const formData = new FormData();
    formData.append("username", editedUsername);
    formData.append("introduction_text", editedIntro);
    if (selectedFile) formData.append("user_icon", selectedFile);
  
    try {
      await axios.post(`${API_BASE_URL}/mypage/${user.id}`, formData);
  
      const res = await axios.get(`${API_BASE_URL}/mypage/${user.id}`);
      setEditedUsername(res.data.user.username);
      setEditedIntro(res.data.user.introduction_text || "");
      setArticles(res.data.articles);
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
  

  return (
    <div className="mypage-container">
      <h2>マイページ</h2>

      {user && (
        <div
          className="user-profile"
          style={{
            border: "1px solid #ddd",
            padding: "1rem",
            borderRadius: "8px",
            maxWidth: "400px",
          }}
        >
          <img
            src={user.user_icon}
            alt="User Icon"
            width={80}
            height={80}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />

          {editing ? (
            <>
              <input
                type="text"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                placeholder="ユーザー名"
                style={{ display: "block", margin: "0.5rem 0", width: "100%" }}
              />
              <textarea
                value={editedIntro}
                onChange={(e) => setEditedIntro(e.target.value)}
                placeholder="自己紹介"
                style={{ display: "block", marginBottom: "0.5rem", width: "100%" }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setSelectedFile(e.target.files ? e.target.files[0] : null)
                }
                style={{ marginBottom: "0.5rem" }}
              />
              <button onClick={handleSave}>保存</button>
              <button onClick={() => setEditing(false)}>キャンセル</button>
            </>
          ) : (
            <>
              <h3>{user.username}</h3>
              <p>{user.introduction_text}</p>
              <button onClick={() => setEditing(true)}>プロフィール編集</button>
            </>
          )}
        </div>
      )}

      <div className="user-articles" style={{ marginTop: "2rem" }}>
        <h3>投稿記事一覧</h3>
        {loading ? (
          <p>読み込み中...</p>
        ) : articles.length === 0 ? (
          <p>まだ記事が投稿されていません。</p>
        ) : (
          <div>
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;
