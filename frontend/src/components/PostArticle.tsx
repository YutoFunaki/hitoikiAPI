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
        if (files) {
            const validFiles = Array.from(files).filter(file =>
                ["image/jpeg", "image/png", "video/mp4"].includes(file.type) && file.size <= 10 * 1024 * 1024
            );
            if (validFiles.length < files.length) {
                alert("一部のファイルは無効な形式またはサイズが大きすぎます。");
            }

            const uploadedFiles = [...mediaFiles];

            for (const file of validFiles) {
                const formData = new FormData();
                formData.append("file", file);

                try {
                    const response = await fetch("http://localhost:8000/upload-media/", {
                        method: "POST",
                        body: formData,
                    });

                    if (!response.ok) throw new Error("アップロードに失敗しました");

                    const data = await response.json();
                    uploadedFiles.push({ file, url: data.url });
                } catch (error) {
                    console.error("ファイルのアップロードに失敗しました:", error);
                }
            }

            setMediaFiles(uploadedFiles);
        }
    };

    const handleInsertMedia = (url: string) => {
        setContent(prevContent => `${prevContent}\n![Media](${url})\n`);
    };

    const handleSubmit = async () => {
        if (!title || selectedCategories.length === 0 || !content) {
            alert("タイトル、カテゴリ、本文をすべて入力してください。");
            return;
        }
    
        try {
            const userId = 1; // 仮のユーザーID。認証機能を統合する際に動的に設定
            console.log("送信する create_user_id:", userId);
            const formData = new FormData();
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
                <button onClick={handleFileUploadClick}>画像・動画を追加</button>
            </div>

            <div className="media-preview">
                {mediaFiles.map(({ file, url }, index) => (
                    <div key={index} className="media-item">
                        {file.type.startsWith("image/") && (
                            <img src={url} alt={file.name} style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} />
                        )}
                        {file.type.startsWith("video/") && (
                            <video src={url} controls style={{ maxWidth: "100px", maxHeight: "100px", objectFit: "cover" }} />
                        )}
                        <span style={{ fontSize: "12px", marginTop: "5px" }}>{file.name}</span>
                        <button onClick={() => handleInsertMedia(url)} style={{ fontSize: "12px" }}>
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