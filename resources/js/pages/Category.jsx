import axios from "axios";
import { useEffect, useState } from "react";
import "../../css/pages/Category.css";
import Header from "../components/Header";
import StoreForm from "../components/StoreForm";
import SubmitButton from "../components/SubmitButton";

const Category = () => {
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [error, setError] = useState("");

    const getCategories = async () => {
        try {
            const response = await axios.get("/api/categories");

            setCategories(response.data);
        } catch {
            setError("カテゴリの取得に失敗しました。");
        }
    };

    useEffect(() => {
        getCategories();
    }, []);

    const getErrorMessage = (error) => {
        return error.response?.data?.errors?.name?.[0] ?? "処理に失敗しました。";
    };

    const storeCategory = async (e) => {
        e.preventDefault();

        try {
            // 追加後すぐ画面に反映するため、APIの戻り値を一覧へ足す。
            const response = await axios.post("/api/categories", {
                name: newCategoryName,
            });

            setCategories([...categories, response.data]);
            setNewCategoryName("");
            setError("");
        } catch (error) {
            setError(getErrorMessage(error));
        }
    };

    const changeCategoryName = (id, name) => {
        // 入力中の文字を先に画面へ反映し、変更ボタンを押したときにAPI保存する。
        setCategories(
            categories.map((category) =>
                category.id === id ? { ...category, name } : category,
            ),
        );
    };

    const updateCategory = async (category) => {
        try {
            await axios.put(`/api/categories/${category.id}`, {
                name: category.name,
            });

            setError("");
        } catch (error) {
            setError(getErrorMessage(error));
        }
    };

    const deleteCategory = async (category) => {
        if (!window.confirm(`${category.name}を削除しますか？`)) {
            return;
        }

        try {
            await axios.delete(`/api/categories/${category.id}`);

            // 削除成功後は、再取得せず手元の一覧から対象カテゴリだけ外す。
            setCategories(
                categories.filter((item) => item.id !== category.id),
            );
            setError("");
        } catch {
            setError("削除に失敗しました。");
        }
    };

    return (
        <>
            <Header />
            <div className="categoryContainer">
                <StoreForm
                    name={newCategoryName}
                    onNameChange={(e) => setNewCategoryName(e.target.value)}
                    onSubmit={storeCategory}
                />

                {error && <p className="categoryError">{error}</p>}

                <table className="categoryTable">
                    <thead>
                        <tr>
                            <th className="nameCol">カテゴリ名</th>
                            <th className="buttonCol"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id}>
                                <td className="nameCol">
                                    <input
                                        className="categoryNameInput"
                                        type="text"
                                        value={category.name}
                                        onChange={(e) =>
                                            changeCategoryName(
                                                category.id,
                                                e.target.value,
                                            )
                                        }
                                    />
                                </td>
                                <td className="buttonCol">
                                    <SubmitButton
                                        onUpdate={() =>
                                            updateCategory(category)
                                        }
                                        onDelete={() =>
                                            deleteCategory(category)
                                        }
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Category;
