import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMde from "react-mde";
import Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EditArticle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
  const [mediaFiles, setMediaFiles] = useState<{ file: File; url: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await axios.get(`${API_URL}/edit-article/${id}`);
        setTitle(res.data.title);
        setContent(res.data.content);
        setSelectedCategories(res.data.categories.map((catId: string) => Number(catId)));
        if (res.data.content_image) {
          const media = res.data.content_image.map((url: string) => ({
            file: new File([""], url.split("/").pop() || "media", { type: "image/jpeg" }),
            url: url.startsWith("http") ? url : `${API_URL}${url}`,
            type: "image/jpeg",
          }));
          setMediaFiles(media);
        }
      } catch (err) {
        console.error("記事取得失敗:", err);
      }
    };

    fetchArticle();
  }, [id]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("ログインしてください");
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("categories", JSON.stringify(selectedCategories));
      formData.append("public_status", "public");
      formData.append("update_user_id", userId.toString());
      mediaFiles.forEach(({ file }) => formData.append("files", file));

      const res = await fetch(`${API_URL}/edit-article/${id}`, {
        method: "post",
        body: formData,
      });

      if (!res.ok) throw new Error("更新に失敗しました");

      alert("記事を更新しました！");
      navigate(`/article/${id}`);
    } catch (err) {
      console.error("更新エラー:", err);
      alert("記事の更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    const uploadedFiles: { file: File; url: string; type: string }[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_URL}/upload-media/`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("アップロード失敗");

        const data = await res.json();
        const fullUrl = data.url.startsWith("http") ? data.url : `${API_URL}${data.url}`;
        uploadedFiles.push({ file, url: fullUrl, type: file.type });
      } catch (error) {
        console.error("アップロードエラー:", error);
      }
    }

    setMediaFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const handleInsertMedia = (url: string, type: string) => {
    const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

    if (fullUrl.startsWith("blob:")) {
      alert("アップロード完了をお待ちください");
      return;
    }

    if (type.startsWith("video/")) {
      setContent((prev) => `${prev}\n<video src="${fullUrl}" controls style="max-width:100%;"></video>\n`);
    } else {
      setContent((prev) => `${prev}\n![Media](${fullUrl})\n`);
    }
  };

  const converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  });

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

  const categoryOptions = [
    { id: 1, name: "技術" },
    { id: 2, name: "ビジネス" },
    { id: 3, name: "ライフスタイル" },
    { id: 4, name: "エンタメ" },
    { id: 5, name: "健康" },
  ];

  return (
    <div className="post-article-page">
      <h1>記事を編集</h1>

      <div className="form-group">
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="記事のタイトルを入力してください"
        />
      </div>

      <div className="form-group">
        <label>カテゴリ</label>
        <div className="categories">
          {categoryOptions.map((cat) => (
            <label key={cat.id} className="category-item">
              <input
                type="checkbox"
                value={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onChange={() =>
                  setSelectedCategories((prev) =>
                    prev.includes(cat.id)
                      ? prev.filter((id) => id !== cat.id)
                      : [...prev, cat.id]
                  )
                }
              />
              {cat.name}
            </label>
          ))}
        </div>
      </div>

      <ReactMde
        value={content}
        onChange={setContent}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        generateMarkdownPreview={(markdown) =>
          Promise.resolve(`<div class="react-mde-preview">${converter.makeHtml(markdown)}</div>`)
        }
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        multiple
        accept="image/*,video/*"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <button onClick={handleFileUploadClick} disabled={loading}>
        画像・動画を追加
      </button>

      <div className="media-preview">
        {mediaFiles.map(({ file, url, type }, index) => (
          <div key={index} className="media-item">
            {type.startsWith("image/") && (
              <img src={url.startsWith("http") ? url : `${API_URL}${url}`} alt={file.name} style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} />
            )}
            {type.startsWith("video/") && (
              <video src={url.startsWith("http") ? url : `${API_URL}${url}`} controls style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} />
            )}
            <span style={{ fontSize: "12px", marginTop: "5px" }}>{file.name}</span>
            <button onClick={() => handleInsertMedia(url, type)} style={{ fontSize: "12px" }}>
              本文に挿入
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "更新中..." : "記事を更新する"}
      </button>
    </div>
  );
};

export default EditArticle;
