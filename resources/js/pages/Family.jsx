import axios from "axios";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import { useAuth } from "../auth/AuthContext";
import "../../css/pages/Family.css";

const Family = () => {
    const { family, updateFamily } = useAuth();
    const [groupName, setGroupName] = useState(family?.name ?? "");
    const [inviteUrl, setInviteUrl] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setGroupName(family?.name ?? "");
    }, [family]);

    const copyText = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);

                return true;
            } catch {
                // ブラウザによっては通信後の自動コピーが拒否されるため、下の方式も試します。
            }
        }

        const textarea = document.createElement("textarea");

        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        textarea.style.left = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);

        const copied = document.execCommand("copy");

        document.body.removeChild(textarea);

        return copied;
    };

    const updateGroupName = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.put("/api/family", { name: groupName });

            updateFamily(response.data);
            setMessage("グループ名を変更しました。");
            setError("");
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;

            setError(
                errors
                    ? Object.values(errors).flat()[0]
                    : "グループ名の変更に失敗しました。",
            );
            setMessage("");
        }
    };

    const createInvitation = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post("/api/invitations");
            const newInviteUrl = response.data.invite_url;

            setInviteUrl(newInviteUrl);
            setError("");

            if (await copyText(newInviteUrl)) {
                setMessage("招待リンクを作成してコピーしました。LINEに貼り付けて送れます。");
            } else {
                setMessage("招待リンクを作成しました。コピーできない場合は下のボタンを押してください。");
            }
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;

            setError(
                errors
                    ? Object.values(errors).flat()[0]
                    : "招待リンクの作成に失敗しました。",
            );
            setMessage("");
        }
    };

    const copyInviteUrl = async () => {
        if (await copyText(inviteUrl)) {
            setMessage("招待リンクをコピーしました。");
            setError("");
        } else {
            setError("自動コピーに失敗しました。招待リンクを選択してコピーしてください。");
        }
    };

    return (
        <>
            <Header />
            <main className="familyContainer">
                <section className="groupPanel">
                    <div className="groupHeader">
                        <div>
                            <p className="groupLabel">現在のグループ</p>
                            <h1 className="familyTitle">
                                {family?.name ?? "グループ"}
                            </h1>
                        </div>
                    </div>

                    {message && <p className="familyMessage">{message}</p>}
                    {error && <p className="familyError">{error}</p>}

                    <form className="groupNameForm" onSubmit={updateGroupName}>
                        <label htmlFor="groupName">グループ名</label>
                        <div className="groupNameField">
                            <input
                                id="groupName"
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                            <button type="submit">変更</button>
                        </div>
                    </form>

                    <form className="familyForm" onSubmit={createInvitation}>
                        <button type="submit">招待リンクを作成してコピー</button>
                    </form>

                    {inviteUrl && (
                        <div className="inviteBox">
                            <label htmlFor="inviteUrl">招待リンク</label>
                            <div className="inviteField">
                                <input id="inviteUrl" readOnly value={inviteUrl} />
                                <button type="button" onClick={copyInviteUrl}>
                                    コピー
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </>
    );
};

export default Family;
