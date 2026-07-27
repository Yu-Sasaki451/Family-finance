import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { getAuthToken, setAuthToken } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [family, setFamily] = useState(null);
    const [loading, setLoading] = useState(true);

    const applyAuth = (data) => {
        if (data.token) {
            // ログイン/登録直後はAPIトークンも受け取るため、共通の保存処理に渡す。
            setAuthToken(data.token);
        }

        // 画面全体で参照するログインユーザーとグループ情報をここで保持する。
        setUser(data.user);
        setFamily(data.family);
    };

    const register = async (form) => {
        const response = await axios.post("/api/auth/register", form);
        applyAuth(response.data);
    };

    const login = async (form) => {
        const response = await axios.post("/api/auth/login", form);
        applyAuth(response.data);
    };

    const logout = async () => {
        try {
            await axios.post("/api/auth/logout");
        } finally {
            setAuthToken(null);
            setUser(null);
            setFamily(null);
        }
    };

    const updateFamily = (updatedFamily) => {
        setFamily(updatedFamily);
    };

    useEffect(() => {
        const fetchUser = async () => {
            if (!getAuthToken()) {
                // トークンがない場合は、API確認をせず未ログインとして画面を表示する。
                setLoading(false);

                return;
            }

            try {
                // 保存済みトークンがまだ有効か、アプリ起動時にサーバーへ確認する。
                const response = await axios.get("/api/auth/me");
                setUser(response.data.user);
                setFamily(response.data.family);
            } catch {
                // サーバー側でトークンが無効なら、スマホやPC内の古いログイン情報も消す。
                setAuthToken(null);
                setUser(null);
                setFamily(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                family,
                loading,
                register,
                login,
                logout,
                updateFamily,
                isAuthenticated: Boolean(user),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
