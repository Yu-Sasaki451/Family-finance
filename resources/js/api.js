import axios from "axios";

const token = localStorage.getItem("auth_token");

if (token) {
    // 画面を再読み込みしてもログイン状態を保つため、保存済みトークンをAxiosへ設定する。
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export const setAuthToken = (newToken) => {
    if (newToken) {
        // ログイン成功時は、以後のAPIが自動で認証付きになるよう共通ヘッダーへ入れる。
        localStorage.setItem("auth_token", newToken);
        axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        return;
    }

    // ログアウトや認証切れのときは、保存済みトークンと共通ヘッダーを両方消す。
    localStorage.removeItem("auth_token");
    delete axios.defaults.headers.common.Authorization;
};

export const getAuthToken = () => localStorage.getItem("auth_token");
