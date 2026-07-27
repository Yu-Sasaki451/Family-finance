import axios from "axios";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ROUTES } from "../routes/routes";
import "../../css/pages/Auth.css";

const Register = () => {
    const { isAuthenticated, register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get("invite") ?? "";
    const [invite, setInvite] = useState(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        invite_token: inviteToken,
    });
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchInvite = async () => {
            if (!inviteToken) {
                return;
            }

            try {
                // 招待リンクから来た場合は、参加先グループと指定メールアドレスを先に取得する。
                const response = await axios.get(`/api/invitations/${inviteToken}`);

                setInvite(response.data);
                setForm((current) => ({
                    ...current,
                    email: response.data.email ?? current.email,
                }));
            } catch {
                setError("招待リンクが正しくないか、有効期限が切れています。");
            }
        };

        fetchInvite();
    }, [inviteToken]);

    if (isAuthenticated) {
        return <Navigate to={ROUTES.INDEX} replace />;
    }

    const changeForm = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const submit = async (e) => {
        e.preventDefault();

        try {
            await register(form);
            // 登録に成功したらトークンも保存済みなので、そのままトップページへ移動する。
            navigate(ROUTES.INDEX, { replace: true });
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;

            setError(
                errors
                    ? Object.values(errors).flat()[0]
                    : "登録に失敗しました。",
            );
        }
    };

    return (
        <main className="authContainer">
            <form className="authForm" onSubmit={submit}>
                <h1>新規登録</h1>

                {invite && (
                    <p className="authMessage">
                        {invite.family.name}に参加します。
                    </p>
                )}
                {error && <p className="authError">{error}</p>}

                <label>
                    名前
                    <input
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={changeForm}
                    />
                </label>

                <label>
                    メールアドレス
                    <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={changeForm}
                    />
                </label>

                <label>
                    パスワード
                    <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={changeForm}
                    />
                </label>

                <button type="submit">登録する</button>

                <p>
                    すでにアカウントがある場合は
                    <Link to={ROUTES.LOGIN}>ログイン</Link>
                </p>
            </form>
        </main>
    );
};

export default Register;
