import React, { useState, useRef } from "react";
import ReactMde from "react-mde";
import Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";

const categories = ["技術", "ビジネス", "ライフスタイル", "エンタメ", "健康"];

const PostArticle: React.FC = () => {
    const [title, setTitle] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [content, setContent] = useState("");
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUploadClick = () => {
        if (!fileInputRef.current) {
            console.error("fileInputRef.current is null");
            return;
        }
        console.log("fileInputRef.current:", fileInputRef.current);
        fileInputRef.current.click();
    };
    

    const handleCategoryChange = (category: string) => {
        setSelectedCategories((prev) => {
            if (prev.includes(category)) {
                return prev.filter((cat) => cat !== category);
            } else {
                return [...prev, category];
            }
        });
    };

    const handleFileUpload = (files: FileList | null) => {
        console.log("handleFileUpload");
        if (files) {
            const validFiles = Array.from(files).filter(file =>
                ["image/jpeg", "image/png", "video/mp4"].includes(file.type) && file.size <= 10 * 1024 * 1024
            );
            if (validFiles.length < files.length) {
                alert("一部のファイルは無効な形式またはサイズが大きすぎます。");
            }
            setMediaFiles([...mediaFiles, ...validFiles]);
        }
    };    

    const handleInsertMedia = (file: File) => {
        const fileUrl = URL.createObjectURL(file);
        setContent((prevContent) => `${prevContent}\n![Media](${fileUrl})\n`);
    };

    const handleSubmit = async () => {
        if (!title || selectedCategories.length === 0 || !content) {
            alert("タイトル、カテゴリ、本文をすべて入力してください。");
            return;
        }
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("categories", JSON.stringify(selectedCategories));
            formData.append("content", content);
            mediaFiles.forEach((file, index) =>
                formData.append(`media_${index}`, file)
            );

            await fetch("http://localhost:8000/post-article", {
                method: "POST",
                body: formData,
            });
            alert("記事が投稿されました！");
        } catch (error) {
            console.error("投稿に失敗しました:", error);
        }
    };

    const converter = new Showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
    });

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

            {/* カテゴリ選択 */}
            <div className="form-group">
            <label>カテゴリ</label>
            <div className="categories">
                {categories.map((cat) => (
                <label key={cat} className="category-item">
                    <input
                    type="checkbox"
                    value={cat}
                    checked={selectedCategories.includes(cat)}
                    onChange={() => handleCategoryChange(cat)}
                    />
                    {cat}
                </label>
                ))}
            </div>
            </div>

            {/* Markdownエディター */}
            <div className="form-group">
                <label>本文</label>
                <ReactMde
                    value={content}
                    onChange={setContent}
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    generateMarkdownPreview={(markdown) =>
                        Promise.resolve(converter.makeHtml(markdown))
                    }
                />
            </div>

            <div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "block" }}
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => {
                        console.log("onChange triggered", e.target.files);
                        if (e.target.files) {
                            console.log("Files selected:", Array.from(e.target.files).map(file => file.name));
                        } else {
                            console.log("No files selected");
                        }
                        handleFileUpload(e.target.files);
                    }}
                />
                <button onClick={handleFileUploadClick}>画像・動画を追加</button>
            </div>

            {/* 追加したメディア一覧 */}
            {mediaFiles.map((file, index) => (
                <div key={index} className="media-item">
                    {file.type.startsWith("image/") && (
                        <img src={URL.createObjectURL(file)} alt={file.name} width="100" />
                    )}
                    {file.type.startsWith("video/") && (
                        <video src={URL.createObjectURL(file)} controls width="100" />
                    )}
                    <span>{file.name}</span>
                    <button onClick={() => handleInsertMedia(file)}>
                        本文に挿入
                    </button>
                </div>
            ))}


            {/* 投稿ボタン */}
            <button onClick={handleSubmit}>記事を投稿する</button>
        </div>
    );
};

export default PostArticle;
