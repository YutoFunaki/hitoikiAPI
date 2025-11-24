import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface User {
  id: number;
  username: string;
  user_icon: string;
  introduction_text: string;
}

interface AuthContextType {
  isAuthenticated: boolean | undefined;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    console.log("🔑 AuthContext 初期化開始...");
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    console.log("🔍 ローカルストレージ確認:", { 
      hasToken: !!token, 
      hasUser: !!storedUser 
    });
    
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log("✅ ユーザー情報復元:", userData);
        setIsAuthenticated(true);
        setUser(userData);
      } catch (error) {
        console.error("❌ ユーザー情報パースエラー:", error);
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      console.log("❌ 認証情報なし");
      setIsAuthenticated(false);
      setUser(null);
    }
    console.log("🏁 AuthContext 初期化完了");
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
