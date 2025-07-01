// 環境変数からAPIベースURLを取得
const getApiBaseUrl = (): string => {
  // Vite環境変数 (VITE_で始まる)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 本番環境の場合
  if (import.meta.env.PROD) {
    // 本番環境では、以下のいずれかのパターンを使用
    // 1. 同じドメインのサブパス（例：/api）
    // 2. 異なるポート（例：8000）
    // 3. 完全に異なるドメイン
    
    const currentOrigin = window.location.origin;
    
    // 現在のドメインがlocalhostの場合（開発環境でPRODビルドを実行）
    if (currentOrigin.includes('localhost')) {
      return currentOrigin.replace(':5173', ':8000').replace(':5174', ':8000').replace(':5175', ':8000');
    }
    
    // 本番環境では、APIエンドポイントを指定
    // calmie.jp の場合は、ポート8000でバックエンドが動作していると仮定
    if (currentOrigin.includes('calmie.jp')) {
      return 'http://calmie.jp:8000';
    }
    
    // その他の本番環境では /api パスを使用
    return `${currentOrigin}/api`;
  }

  // 開発環境のデフォルト
  return "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();

// API呼び出し用のヘルパー関数
export const apiRequest = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}; 