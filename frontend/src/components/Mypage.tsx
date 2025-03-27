import React, { useEffect, useState } from "react";
import axios from "axios";

interface User {
  id: number;
  username: string;
  user_icon: string;
  introduction_text: string;
}

interface Article {
  id: number;
  title: string;
  thumbnail_url?: string;
  public_at: string;
}

const MyPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [editedIntro, setEditedIntro] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    axios
      .get(`http://localhost:8000/mypage/${userId}`)
      .then((res) => {
        setUser(res.data.user);
        setEditedUsername(res.data.user.username);
        setEditedIntro(res.data.user.introduction_text || "");
        setArticles(res.data.articles);
      })
      .catch((err) => console.error("❌ APIエラー:", err));
  }, []);

  const handleSave = async () => {
    if (!user) return;
    const formData = new FormData();
    formData.append("username", editedUsername);
    formData.append("introduction_text", editedIntro);
    if (selectedFile) formData.append("user_icon", selectedFile);

    try {
        await axios.post(`http://localhost:8000/mypage/${user.id}`, formData);

        // リロードの代わりに再取得して即時反映
        axios
          .get(`http://localhost:8000/mypage/${user.id}`)
          .then((res) => {
            setUser(res.data.user);
            setArticles(res.data.articles);
            setEditing(false);
          });
    } catch (err) {
      console.error("❌ プロフィール更新失敗:", err);
    }
  };

  return (
    <div className="mypage-container">
      <h2>マイページ</h2>

      {user && (
        <div className="user-profile">
          <img src={user.user_icon} alt="User Icon" width={80} height={80} />

          {editing ? (
            <>
              <input
                type="text"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
              />
              <textarea
                value={editedIntro}
                onChange={(e) => setEditedIntro(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setSelectedFile(e.target.files ? e.target.files[0] : null)
                }
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

      <div className="user-articles">
        <h3>投稿記事一覧</h3>
        {articles.map((article) => (
          <div key={article.id} className="article-card">
            <h4>{article.title}</h4>
            <button onClick={() => alert(`記事 ${article.id} を編集します`)}>
              編集
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPage;