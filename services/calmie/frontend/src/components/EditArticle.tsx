import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import axios from "axios";
import { API_BASE_URL } from '../config/api';
import { useAuth } from "../contexts/authContext";

const EditArticle: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // デバッグ情報
  console.log(`🔗 URL パラメータ取得: articleId=${articleId}`);
  console.log(`🌐 現在のURL: ${window.location.href}`);
  console.log(`📡 API_BASE_URL: ${API_BASE_URL}`);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{ file: File; url: string; type: string }[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) {
        console.error("❌ 記事ID不明:", articleId);
        setError("記事IDが取得できませんでした。URLを確認してください。");
        setInitialLoading(false);
        return;
      }
      
      try {
        setInitialLoading(true);
        setError(null);
        
        console.log(`🔍 記事データ取得開始: article_id=${articleId}`);
        console.log(`📡 API URL: ${API_BASE_URL}/edit-article/${articleId}`);
        
        const res = await axios.get(`${API_BASE_URL}/edit-article/${articleId}`);
        console.log(`✅ API レスポンス成功:`, res.data);
        
        setTitle(res.data.title || "");
        setContent(res.data.content || "");
        
        // カテゴリの処理 - 文字列の配列として扱う
        if (res.data.categories) {
          const categories = Array.isArray(res.data.categories) 
            ? res.data.categories 
            : res.data.categories.split(',').map((cat: string) => cat.trim());
          setSelectedCategories(categories);
          console.log(`🏷️ カテゴリ設定完了:`, categories);
        }
        
        // メディアファイルの処理
        if (res.data.content_image && res.data.content_image.length > 0) {
          const media = res.data.content_image.map((url: string) => ({
            file: new File([""], url.split("/").pop() || "media", { type: "image/jpeg" }),
            url: url.startsWith("http") ? url : `${API_BASE_URL}${url}`,
            type: "image/jpeg",
          }));
          setMediaFiles(media);
          console.log(`📷 メディアファイル設定完了:`, media);
        }
        
        // サムネイルの処理
        if (res.data.thumbnail_image) {
          // 既存のサムネイルファイル情報を保持
          const thumbnailFileName = res.data.thumbnail_image.split("/").pop() || "thumbnail";
          setThumbnailFile(new File([""], thumbnailFileName, { type: "image/jpeg" }));
          console.log(`🖼️ サムネイル設定完了:`, thumbnailFileName);
        }
        
        console.log(`🎉 記事データ取得完了: ${res.data.title}`);
        
      } catch (err: any) {
        console.error("❌ 記事取得エラー:", err);
        
        // 詳細なエラー情報を収集
        let errorMessage = "記事を取得できませんでした。";
        
        if (err.response) {
          // HTTPエラーレスポンス
          console.error("HTTP エラー:", err.response.status, err.response.data);
          errorMessage = `HTTP ${err.response.status}: ${err.response.data?.detail || err.response.statusText}`;
        } else if (err.request) {
          // リクエストが送信されたが、レスポンスが受信されなかった
          console.error("リクエストエラー:", err.request);
          errorMessage = "サーバーに接続できませんでした。ネットワークを確認してください。";
        } else {
          // その他のエラー
          console.error("その他のエラー:", err.message);
          errorMessage = err.message || "不明なエラーが発生しました。";
        }
        
        setError(errorMessage);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && categoryInput.trim()) {
      e.preventDefault();
      const newCat = categoryInput.trim();
      if (!selectedCategories.includes(newCat)) {
        setSelectedCategories([...selectedCategories, newCat]);
      }
      setCategoryInput("");
    }
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== cat));
  };

  const handleSubmit = async () => {
    if (!title || selectedCategories.length === 0 || !content) {
      alert("タイトル、カテゴリ、本文をすべて入力してください。");
      return;
    }

          try {
        setLoading(true);
        
        // 認証チェック
        if (!isAuthenticated || !user?.id) {
          console.error("認証エラー:", { isAuthenticated, userId: user?.id });
          alert("ログインしてください");
          return;
        }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("categories", JSON.stringify(selectedCategories));
      formData.append("public_status", "public");
      formData.append("update_user_id", user?.id?.toString() || ""); // ログインユーザーのIDを使用
      
      // サムネイルファイルを追加（新しいファイルが選択された場合）
      if (thumbnailFile && thumbnailFile.size > 0) {
        formData.append("thumbnail", thumbnailFile);
      }
      
      mediaFiles.forEach(({ file }) => {
        if (file.size > 0) { // 実際のファイルのみ追加
          formData.append("files", file);
        }
      });

      const res = await fetch(`${API_BASE_URL}/edit-article/${articleId}`, {
        method: "post",
        body: formData,
      });

      if (!res.ok) throw new Error("更新に失敗しました");

      alert("記事を更新しました！");
      navigate(`/articles/${articleId}`);
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

    setUploading(true);
    const uploadedFiles: { file: File; url: string; type: string }[] = [];

    for (const file of Array.from(files)) {
      if (!["image/jpeg", "image/png", "video/mp4", "video/quicktime"].includes(file.type)) {
        alert(`${file.name} は無効な形式です。`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE_URL}/upload-media/`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("アップロード失敗");

        const data = await res.json();
        const fullUrl = data.url.startsWith("http") ? data.url : `${API_BASE_URL}${data.url}`;
        uploadedFiles.push({ file, url: fullUrl, type: file.type });
      } catch (error) {
        console.error("アップロードエラー:", error);
        alert(`${file.name} のアップロードに失敗しました`);
      }
    }

    setMediaFiles((prev) => [...prev, ...uploadedFiles]);
    setUploading(false);
  };

  const handleInsertMedia = (url: string, type: string) => {
    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

    if (fullUrl.startsWith("blob:")) {
      alert("アップロードが完了するまで少々お待ちください・・・");
      return;
    }

    // セキュリティ改善: ファイル名のみを表示用に使用
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const displayName = fileName.includes('.') ? 
      `画像_${Date.now()}.${fileName.split('.').pop()}` : 
      `メディア_${Date.now()}`;

    if (type.startsWith("video/")) {
      setContent((prev) => `${prev}\n<video src="${fullUrl}" controls style="max-width:100%;" title="${displayName}"></video>\n`);
    } else {
      setContent((prev) => `${prev}\n![${displayName}](${fullUrl})\n`);
    }
  };

  // 初期ローディング状態
  if (initialLoading) {
    return (
      <div className="post-article-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>記事を読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="post-article-page">
        <div className="error-container">
          <h2>❌ エラーが発生しました</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)}>戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-article-page">
      <div className="page-header">
        <h1>✏️ 記事を編集</h1>
        <p>記事の内容を編集して更新してください</p>
      </div>

      <div className="form-group">
        <label>📝 タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="記事のタイトルを入力してください"
        />
      </div>

      <div className="form-group">
        <label>🖼️ サムネイル画像</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setThumbnailFile(file);
          }}
        />
        {thumbnailFile && (
          <div className="thumbnail-preview">
            {thumbnailFile.size > 0 ? (
              <>
                <img 
                  src={URL.createObjectURL(thumbnailFile)} 
                  alt="サムネイルプレビュー" 
                  style={{ 
                    maxWidth: "200px", 
                    maxHeight: "150px", 
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "2px solid #ddd"
                  }} 
                />
                <p>📁 {thumbnailFile.name}</p>
              </>
            ) : (
              <>
                <div 
                  style={{ 
                    width: "200px", 
                    height: "150px", 
                    backgroundColor: "#f0f0f0",
                    borderRadius: "8px",
                    border: "2px solid #ddd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666"
                  }}
                >
                  🖼️ 既存のサムネイル
                </div>
                <p>📁 現在のサムネイル</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>🏷️ カテゴリ（自由入力・Enterで追加）</label>
        <div className="tag-input-wrapper">
          {selectedCategories.map((cat, index) => (
            <span key={index} className="tag">
              {cat}
              <button type="button" onClick={() => removeCategory(cat)}>×</button>
            </span>
          ))}
          <input
            type="text"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
            placeholder="Enterで追加"
          />
        </div>
      </div>

      <div className="form-group">
        <label>✍️ 本文</label>
        <MDEditor
          value={content}
          onChange={(value) => setContent(value || "")}
          data-color-mode="light"
          height={400}
        />
      </div>

      <div className="media-upload-section">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <button className="upload-button" onClick={handleFileUploadClick} disabled={uploading}>
          {uploading ? "📤 アップロード中..." : "📷 画像・動画を追加"}
        </button>
        <p style={{ marginTop: '8px', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
          JPEG, PNG, MP4, MOV形式をサポート
        </p>
      </div>

      {uploading && (
        <div className="upload-status">
          <p>📤 アップロード中...</p>
        </div>
      )}

      {mediaFiles.length > 0 && (
        <div className="media-preview">
          {mediaFiles.map(({ file, url, type }, index) => {
            // セキュリティ: URLからファイル名のみを抽出
            const getSecureFileName = (url: string, originalName: string) => {
              if (originalName && originalName !== "") return originalName;
              const urlParts = url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              // UUIDを隠してユーザーフレンドリーな名前に変更
              return fileName.includes('.') ? `media_${index + 1}.${fileName.split('.').pop()}` : `media_${index + 1}`;
            };

            const secureFileName = getSecureFileName(url, file.name);
            const displayUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

            return (
              <div key={index} className="media-item">
                {type.startsWith("image/") && (
                  <img 
                    src={displayUrl} 
                    alt={secureFileName} 
                    style={{ 
                      maxWidth: "120px", 
                      maxHeight: "120px", 
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "2px solid #ddd"
                    }} 
                    onError={(e) => {
                      // 画像読み込みエラー時のフォールバック
                      const target = e.currentTarget as HTMLImageElement;
                      const nextElement = target.nextElementSibling as HTMLElement;
                      target.style.display = 'none';
                      if (nextElement) nextElement.style.display = 'flex';
                    }}
                  />
                )}
                <div 
                  style={{ 
                    width: "120px", 
                    height: "120px", 
                    backgroundColor: "#f0f0f0",
                    borderRadius: "8px",
                    border: "2px solid #ddd",
                    display: type.startsWith("image/") ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#666",
                    fontSize: "2rem"
                  }}
                >
                  {type.startsWith("video/") ? "🎥" : "📁"}
                </div>
                {type.startsWith("video/") && (
                  <video 
                    src={displayUrl} 
                    controls 
                    style={{ 
                      maxWidth: "120px", 
                      maxHeight: "120px", 
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "2px solid #ddd"
                    }} 
                  />
                )}
                <span className="secure-filename">📎 {secureFileName}</span>
                <button onClick={() => handleInsertMedia(url, type)}>
                  📝 本文に挿入
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="submit-section">
        <button 
          className="submit-button update-button" 
          onClick={handleSubmit} 
          disabled={loading || uploading}
        >
          {loading ? "🔄 更新中..." : "✅ 記事を更新する"}
        </button>
        <button 
          className="cancel-button" 
          onClick={() => navigate(-1)}
          disabled={loading || uploading}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default EditArticle;
