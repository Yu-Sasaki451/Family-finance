import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ROUTES } from "../routes/routes";
import "../../css/pages/Auth.css";

const Login = () => {
    const { isAuthenticated, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const savedEmail = localStorage.getItem("login_email") ?? "";
    const [form, setForm] = useState({ email: savedEmail, password: "" });
    const [rememberEmail, setRememberEmail] = useState(Boolean(savedEmail));
    const [error, setError] = useState("");

    if (isAuthenticated) {
        return <Navigate to={ROUTES.INDEX} replace />;
    }

    const changeForm = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const submit = async (e) => {
        e.preventDefault();

        try {
            await login(form);

            // 次回ログインしやすいよう、チェック時だけメールアドレスを端末に保存する。
            if (rememberEmail) {
                localStorage.setItem("login_email", form.email);
            } else {
                localStorage.removeItem("login_email");
            }

            // 未ログインで弾かれた元ページがあれば、ログイン後そこへ戻す。
            navigate(location.state?.from?.pathname ?? ROUTES.INDEX, {
                replace: true,
            });
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;

            setError(
                errors
                    ? Object.values(errors).flat()[0]
                    : "ログインに失敗しました。",
            );
        }
    };

    return (
        <main className="authContainer">
            <form className="authForm" onSubmit={submit}>
                <h1>ログイン</h1>

                {error && <p className="authError">{error}</p>}

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

                <label className="authCheckboxLabel">
                    <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                    />
                    メールアドレスを保存する
                </label>

                <button type="submit">ログイン</button>

                <p>
                    アカウントがない場合は
                    <Link to={ROUTES.REGISTER}>新規登録</Link>
                </p>
            </form>
        </main>
    );
};

export default Login;
