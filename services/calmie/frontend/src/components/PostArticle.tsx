import React, { useState, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { useAuth } from "../contexts/authContext";
import { API_BASE_URL } from '../config/api';

const PostArticle: React.FC = () => {
    const [title, setTitle] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categoryInput, setCategoryInput] = useState("");
    const [content, setContent] = useState("");
    const [mediaFiles, setMediaFiles] = useState<{ file: File, url: string, type: string }[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user, isAuthenticated } = useAuth();
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);


    const handleFileUploadClick = () => {
        fileInputRef.current?.click();
    };

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
                const response = await fetch(`${API_BASE_URL}/upload-media/`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) throw new Error("アップロードに失敗しました");

                const data = await response.json();
                const fullUrl = data.url.startsWith("http") ? data.url : `${API_BASE_URL}${data.url}`;
                uploadedFiles.push({ file, url: fullUrl, type: file.type });

            } catch (error) {
                console.error("ファイルアップロードエラー:", error);
            }
        }

        setMediaFiles(prev => [...prev, ...uploadedFiles]);
        setUploading(false);
    };

    const handleInsertMedia = (url: string, type: string) => {
        const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

        if (fullUrl.startsWith("blob:")) {
            alert("アップロードが完了するまで少々お待ちください・・・");
            return;
        }

        if (type.startsWith("video/")) {
            setContent(prevContent => `${prevContent}\n<video src="${fullUrl}" controls style="max-width:100%;"></video>\n`);
        } else {
            setContent(prevContent => `${prevContent}\n![Media](${fullUrl})\n`);
        }
    };

    const handleSubmit = async () => {
        if (!title || selectedCategories.length === 0 || !content) {
            alert("タイトル、カテゴリ、本文をすべて入力してください。");
            return;
        }

        if (!isAuthenticated || !user?.id) {
            alert("ログインしてください");
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("create_user_id", user.id.toString());
            formData.append("title", title);
            formData.append("categories", JSON.stringify(selectedCategories));
            if (thumbnailFile) {
                formData.append("thumbnail", thumbnailFile);
            }
            formData.append("content", content);
            formData.append("public_status", "public");
            mediaFiles.forEach(({ file }) => formData.append("files", file));

            const response = await fetch(`${API_BASE_URL}/post-article`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("記事の投稿に失敗しました");

            alert("記事が投稿されました！");
        } catch (error) {
            console.error("投稿に失敗しました:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="post-article-page">
            <h1>📝 記事を投稿する</h1>

            <div className="form-group">
                <label htmlFor="title">📰 タイトル</label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="記事のタイトルを入力してください"
                />
            </div>
            
            <div className="form-group">
                <label>🖼️ サムネイル画像を選択</label>
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
                        <p>選択されたファイル: {thumbnailFile.name}</p>
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
                    onChange={(val) => setContent(val || "")}
                    preview="edit"
                    hideToolbar
                    visibleDragbar={false}
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
                    {mediaFiles.map(({ file, url, type }, index) => (
                        <div key={index} className="media-item">
                            {type.startsWith("image/") && (
                                <img 
                                    src={url.startsWith("http") ? url : `${API_BASE_URL}${url}`} 
                                    alt={file.name} 
                                    style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} 
                                />
                            )}
                            {type.startsWith("video/") && (
                                <video 
                                    src={url.startsWith("http") ? url : `${API_BASE_URL}${url}`} 
                                    controls 
                                    style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} 
                                />
                            )}
                            <span>{file.name}</span>
                            <button onClick={() => handleInsertMedia(url, type)}>
                                📝 本文に挿入
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="submit-section">
                <button className="submit-button" onClick={handleSubmit} disabled={uploading}>
                    {uploading ? "📤 投稿中..." : "🚀 記事を投稿する"}
                </button>
            </div>
        </div>
    );
};

export default PostArticle;