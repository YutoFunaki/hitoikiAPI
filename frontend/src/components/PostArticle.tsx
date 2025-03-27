import React, { useState, useRef } from "react";
import ReactMde from "react-mde";
import Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";

const PostArticle: React.FC = () => {
    const [title, setTitle] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [content, setContent] = useState("");
    const [mediaFiles, setMediaFiles] = useState<{ file: File, url: string }[]>([]);
    const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
    const [uploading, setUploading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const categories = [
        { id: 1, name: "技術" },
        { id: 2, name: "ビジネス" },
        { id: 3, name: "ライフスタイル" },
        { id: 4, name: "エンタメ" },
        { id: 5, name: "健康" },
    ];
    

    const handleFileUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleCategoryChange = (categoryId: number) => {
        setSelectedCategories((prev) =>
            prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
        );
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
                const response = await fetch("http://localhost:8000/upload-media/", {
                    method: "POST",
                    body: formData,
                });
    
                if (!response.ok) throw new Error("アップロードに失敗しました");
    
                const data = await response.json();
                console.log("アップロード成功:", data.url); // ✅ デバッグ用
                uploadedFiles.push({ file, url: data.url, type: file.type });
    
            } catch (error) {
                console.error("ファイルアップロードエラー:", error);
            }
        }
    
        setMediaFiles(prev => [...prev, ...uploadedFiles]);
        setUploading(false);
    };    
    
    // **画像を圧縮・リサイズする関数**
    const compressImage = async (file: File, maxWidth: number): Promise<File> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d")!;
                
                let { width, height } = img;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
    
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
    
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
                    } else {
                        resolve(file);
                    }
                }, "image/jpeg", 0.8); // 80% の品質で保存
            };
        });
    };
    

    const handleInsertMedia = (url: string, type: string) => {
        if (url.startsWith("blob:")) {
            alert("アップロードが完了するまで少々お待ちください・・・");
            return;
        }
    
        if (type.startsWith("video/")) {
            setContent(prevContent => `${prevContent}\n<video src="${url}" controls style="max-width:100%;"></video>\n`);
        } else {
            setContent(prevContent => `${prevContent}\n![Media](${url})\n`);
        }
    };
    

    const handleSubmit = async () => {
        if (!title || selectedCategories.length === 0 || !content) {
            alert("タイトル、カテゴリ、本文をすべて入力してください。");
            return;
        }
    
        try {
            setUploading(true);
            const userId = localStorage.getItem("userId");
            if (!userId) {
            alert("ログインしてください");
            return;
            }
            const formData = new FormData();
            formData.append("create_user_id", userId);
            formData.append("title", title);
            formData.append("categories", JSON.stringify(selectedCategories));
            formData.append("content", content);
            formData.append("public_status", "public");
            formData.append("create_user_id", userId.toString());
            mediaFiles.forEach(({ file }) => formData.append("files", file));
    
            const response = await fetch("http://localhost:8000/post-article", {
                method: "POST",
                body: formData,
            });
    
            if (!response.ok) throw new Error("記事の投稿に失敗しました");
    
            alert("記事が投稿されました！");
        } catch (error) {
            console.error("投稿に失敗しました:", error);
        } finally {
            setUploading(false);  // ✅ 投稿処理完了
        }
    };
    

    const converter = new Showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
    });
    
    // 画像タグのサイズを指定
    converter.addExtension({
        type: "output",
        regex: /<img src="(.*?)" alt="(.*?)"(.*?)>/g,
        replace: '<img src="$1" alt="$2" style="max-width:100%; max-height:300px; display:block; margin:10px auto;" $3 />'
    }, "imageResizer");
    
    // 動画タグのサイズを指定
    converter.addExtension({
        type: "output",
        regex: /<video src="(.*?)"(.*?)>/g,
        replace: '<video src="$1" $2 style="max-width:100%; max-height:300px; display:block; margin:10px auto;"></video>'
    }, "videoResizer");

    return (
        <div className="post-article-page">
            <h1>記事を投稿する</h1>

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
        {categories.map((cat) => (
            <label key={cat.id} className="category-item">
                <input
                    type="checkbox"
                    value={cat.id}
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => handleCategoryChange(cat.id)}
                />
                {cat.name}
            </label>
        ))}
    </div>
</div>


            <div className="form-group">
                <label>本文</label>
                <ReactMde
                    value={content}
                    onChange={setContent}
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    generateMarkdownPreview={(markdown) =>
                        Promise.resolve(`<div class="react-mde-preview">${converter.makeHtml(markdown)}</div>`)
                    }
                />
            </div>

            <div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                />
                <button onClick={handleFileUploadClick} disabled={uploading}>
                    {uploading ? "アップロード中..." : "画像・動画を追加"}
                </button>
            </div>

            {uploading && <p style={{ color: "red" }}>アップロード中...</p>}  {/* ✅ ローディング表示 */}

            <div className="media-preview">
                {mediaFiles.map(({ file, url, type }, index) => (
                    <div key={index} className="media-item">
                        {type.startsWith("image/") && (
                            <img src={url} alt={file.name} style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} />
                        )}
                        {type.startsWith("video/") && (
                            <video src={url} controls style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} />
                        )}
                        <span style={{ fontSize: "12px", marginTop: "5px" }}>{file.name}</span>
                        <button onClick={() => handleInsertMedia(url, type)} style={{ fontSize: "12px" }}>
                            本文に挿入
                        </button>
                    </div>
                ))}
            </div>


            <button onClick={handleSubmit}>記事を投稿する</button>
        </div>
    );
};

export default PostArticle;