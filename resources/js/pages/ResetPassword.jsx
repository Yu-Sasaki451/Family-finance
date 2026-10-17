import axios from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROUTES } from "../routes/routes";
import "../../css/pages/Auth.css";

export default function ResetPassword() {
    const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [pending, setPending] = useState(false);
    const [done, setDone] = useState(false);
    const [invalid, setInvalid] = useState(!/^[A-Za-z0-9_-]{43}$/.test(token));
    const [error, setError] = useState("");
    const { clearAuth } = useAuth();

    const submit = async (event) => {
        event.preventDefault();
        if (pending || invalid) return;
        if (password !== confirmation) {
            setError("確認用パスワードが一致しません。");
            return;
        }
        setPending(true);
        setError("");
        try {
            await axios.post("/api/auth/reset-password", { token, password, password_confirmation: confirmation });
            clearAuth();
            setPassword("");
            setConfirmation("");
            window.history.replaceState(null, "", ROUTES.RESET_PASSWORD);
            setDone(true);
        } catch (failure) {
            const data = failure.response?.data;
            if (data?.errors?.token) setInvalid(true);
            setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message || "再設定に失敗しました。時間をおいてお試しください。");
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="authContainer">
            <form className="authForm" onSubmit={submit}>
                <h1>新しいパスワード</h1>
                {done ? <>
                    <p className="authMessage" role="status">パスワードを再設定しました。新しいパスワードでログインしてください。</p>
                    <p><Link to={ROUTES.LOGIN}>ログインへ</Link></p>
                </> : <>
                    {error && <p className="authError" role="alert">{error}</p>}
                    {invalid ? <>
                        {!error && <p className="authError" role="alert">再設定リンクが見つからないか、正しくありません。受け取ったリンクから開き直してください。</p>}
                        <p><Link to={ROUTES.FORGOT_PASSWORD}>新しい再設定リンクを取得</Link></p>
                    </> : <>
                        <p>8文字以上128文字以内で設定してください。再設定すると、すべての端末で再ログインが必要になります。</p>
                        <label>
                            新しいパスワード
                            <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
                                value={password} onChange={(event) => setPassword(event.target.value)} />
                        </label>
                        <label>
                            新しいパスワード（確認）
                            <input name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
                                value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                        </label>
                        <button type="submit" disabled={pending}>{pending ? "再設定中..." : "パスワードを再設定"}</button>
                    </>}
                    <p><Link to={ROUTES.LOGIN}>ログインに戻る</Link></p>
                </>}
            </form>
        </main>
    );
}
