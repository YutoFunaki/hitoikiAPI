// OGPメタタグを動的に更新するためのユーティリティ関数

export interface OGPData {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

export const updateOGP = (data: OGPData) => {
  // 基本的なメタタグを更新
  updateMetaTag('property', 'og:title', data.title);
  updateMetaTag('property', 'og:description', data.description);
  updateMetaTag('name', 'description', data.description);
  
  // ページタイトルを更新
  document.title = `${data.title} | Calmie(カルミー)`;
  
  // 画像が提供されている場合
  if (data.image) {
    updateMetaTag('property', 'og:image', data.image);
    updateMetaTag('property', 'og:image:width', '1200');
    updateMetaTag('property', 'og:image:height', '630');
    updateMetaTag('property', 'og:image:type', 'image/jpeg');
    updateMetaTag('name', 'twitter:image', data.image);
    updateMetaTag('name', 'twitter:image:alt', data.title);
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
  }
  
  // URLが提供されている場合
  if (data.url) {
    updateMetaTag('property', 'og:url', data.url);
    updateCanonicalLink(data.url);
  }
  
  // タイプが提供されている場合
  if (data.type) {
    updateMetaTag('property', 'og:type', data.type);
  }
  
  // Twitter Card用のメタタグも更新
  updateMetaTag('name', 'twitter:title', data.title);
  updateMetaTag('name', 'twitter:description', data.description);
};

// メタタグを更新する汎用関数
const updateMetaTag = (attributeName: string, attributeValue: string, content: string) => {
  let metaTag = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  
  if (metaTag) {
    metaTag.setAttribute('content', content);
  } else {
    // メタタグが存在しない場合は新しく作成
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attributeName, attributeValue);
    metaTag.setAttribute('content', content);
    document.head.appendChild(metaTag);
  }
};

// canonical linkを更新する関数
const updateCanonicalLink = (url: string) => {
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  
  if (canonicalLink) {
    canonicalLink.setAttribute('href', url);
  } else {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    canonicalLink.setAttribute('href', url);
    document.head.appendChild(canonicalLink);
  }
};

// OGPメタタグをデフォルト値にリセットする関数
export const resetOGP = () => {
  updateOGP({
    title: 'Calmie(カルミー)',
    description: '心を落ち着けるニュースとコミュニティ。日々のストレスから解放され、穏やかな気持ちになれる記事と交流を提供します。',
    image: 'https://calmie.jp/cat_icon.png',
    url: 'https://calmie.jp',
    type: 'website'
  });
};

// 記事固有のOGPデータを生成する関数
export const generateArticleOGP = (article: {
  id: number;
  title: string;
  content: string;
  thumbnail_image?: string;
}): OGPData => {
  // 記事の説明文を生成（最初の150文字 + Markdownタグ除去）
  const description = article.content
    .replace(/[#*`_\[\]()!]/g, '') // Markdownの記号を除去
    .replace(/\n/g, ' ') // 改行をスペースに変換
    .slice(0, 150) + '...';
  
  return {
    title: article.title,
    description: description,
    image: article.thumbnail_image || 'https://calmie.jp/cat_icon.png',
    url: `https://calmie.jp/articles/${article.id}`,
    type: 'article'
  };
}; 