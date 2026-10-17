import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../routes/routes";
import "../../css/pages/Auth.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [available, setAvailable] = useState(null);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        axios.get("/api/auth/password-reset", { signal: controller.signal })
            .then(({ data }) => setAvailable(data.email_available))
            .catch((failure) => {
                if (!axios.isCancel(failure)) setError("再設定の受付状況を確認できませんでした。画面を再読み込みしてください。");
            });
        return () => controller.abort();
    }, []);

    const submit = async (event) => {
        event.preventDefault();
        if (pending || !available) return;
        setPending(true);
        setError("");
        setMessage("");
        try {
            const { data } = await axios.post("/api/auth/forgot-password", { email });
            setMessage(data.message);
        } catch (failure) {
            const data = failure.response?.data;
            setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message || "受付に失敗しました。時間をおいてお試しください。");
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="authContainer">
            <form className="authForm" onSubmit={submit}>
                <h1>パスワードの再設定</h1>
                {error && <p className="authError" role="alert">{error}</p>}
                {message && <p className="authMessage" role="status">{message}</p>}
                {available === null && !error && <p role="status">受付状況を確認しています...</p>}
                {available === false && (
                    <p className="authMessage">メールでの再設定は現在準備中です。管理者に再設定リンクの発行をご依頼ください。リンクを受け取ったら、新しいパスワードを設定できます。</p>
                )}
                {available === true && <>
                    <p>登録したメールアドレスに再設定リンクをお送りします。リンクは30分間有効です。</p>
                    <label>
                        メールアドレス
                        <input name="email" type="email" autoComplete="email" required maxLength={254}
                            value={email} onChange={(event) => setEmail(event.target.value)} />
                    </label>
                    <button type="submit" disabled={pending}>{pending ? "受付中..." : "再設定リンクを送信"}</button>
                </>}
                <p><Link to={ROUTES.LOGIN}>ログインに戻る</Link></p>
            </form>
        </main>
    );
}
