import axios from "axios";
import { useEffect, useState } from "react";
import "../../css/pages/Ratio.css";
import Header from "../components/Header";

const Ratio = () => {
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const getRatios = async () => {
        try {
            const response = await axios.get("/api/ratios");

            setUsers(response.data.users);
            setCategories(response.data.categories);
        } catch {
            setError("割合の取得に失敗しました。");
        }
    };

    useEffect(() => {
        getRatios();
    }, []);

    const changeRatio = (categoryId, userId, ratio) => {
        // 変更中の割合は画面上の状態だけ更新し、保存ボタンでまとめてAPIへ送る。
        setCategories(
            categories.map((category) =>
                category.id === categoryId
                    ? {
                          ...category,
                          ratios: category.ratios.map((item) =>
                              item.user_id === userId
                                  ? { ...item, ratio }
                                  : item,
                          ),
                      }
                    : category,
            ),
        );
    };

    const updateRatio = async (category) => {
        try {
            // カテゴリ1つ分の全員の割合をまとめて保存する。合計100%チェックはサーバー側で行う。
            await axios.put(`/api/ratios/${category.id}`, {
                ratios: category.ratios,
            });

            setMessage(`${category.name}の割合を変更しました。`);
            setError("");
        } catch (error) {
            const errors = error.response?.data?.errors;

            setError(
                errors ? Object.values(errors).flat()[0] : "変更に失敗しました。",
            );
            setMessage("");
        }
    };

    return (
        <>
            <Header />
            <main className="ratioContainer">
                <h1 className="ratioTitle">割合設定</h1>
                <p className="ratioDescription">
                    カテゴリごとの負担割合を入力してください。合計は100%です。
                </p>

                {message && <p className="ratioMessage">{message}</p>}
                {error && <p className="ratioError">{error}</p>}

                <table className="ratioTable">
                    <thead>
                        <tr>
                            <th>カテゴリ名</th>
                            {users.map((user) => (
                                <th key={user.id}>{user.name}</th>
                            ))}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id}>
                                <td className="ratioCategoryName">
                                    {category.name}
                                </td>
                                {category.ratios.map((item) => (
                                    <td
                                        data-label={
                                            users.find(
                                                (user) =>
                                                    user.id === item.user_id,
                                            )?.name
                                        }
                                        key={item.user_id}
                                    >
                                        <div className="ratioInputGroup">
                                            <input
                                                className="ratioInput"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.ratio}
                                                onChange={(e) =>
                                                    changeRatio(
                                                        category.id,
                                                        item.user_id,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <span>%</span>
                                        </div>
                                    </td>
                                ))}
                                <td className="ratioButtonCell">
                                    <button
                                        className="ratioUpdateButton"
                                        type="button"
                                        onClick={() => updateRatio(category)}
                                    >
                                        変更
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </>
    );
};

export default Ratio;
