import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/pages/Expense.css";
import Header from "../components/Header";
import { ROUTES } from "../routes/routes";

const Expense = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [personalAmountInputs, setPersonalAmountInputs] = useState({});
    const [form, setForm] = useState({
        spent_at: "",
        user_id: "",
        category_id: "",
        amount: "",
        income: "",
        note: "",
        personal_expenses: [],
    });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const getOptions = async () => {
        try {
            const response = await axios.get("/api/expenses/options");

            setUsers(response.data.users);
            setCategories(response.data.categories);
            setPersonalAmountInputs(
                Object.fromEntries(
                    response.data.users.map((user) => [user.id, [""]]),
                ),
            );
            setForm((current) => ({
                ...current,
                personal_expenses: response.data.users.map((user) => ({
                    user_id: user.id,
                    amount: "",
                    note: "",
                })),
            }));
        } catch {
            setError("入力項目の取得に失敗しました。");
        }
    };

    useEffect(() => {
        getOptions();
    }, []);

    const changeForm = (e) => {
        const value = e.target.value;

        setForm({
            ...form,
            [e.target.name]: value,
            ...(e.target.name === "category_id" &&
            !categories.find(
                (category) =>
                    category.id === Number(value) && category.is_electricity,
            )
                ? { income: "" }
                : {}),
        });
    };

    const changePersonalExpense = (userId, name, value) => {
        setForm({
            ...form,
            personal_expenses: form.personal_expenses.map((item) =>
                item.user_id === userId ? { ...item, [name]: value } : item,
            ),
        });
    };

    const changePersonalAmount = (userId, index, value) => {
        const amounts = [...personalAmountInputs[userId]];

        amounts[index] = value;

        const inputAmounts = amounts.filter(
            (amount, amountIndex) =>
                amount !== "" || amountIndex === amounts.length - 1,
        );

        if (inputAmounts[inputAmounts.length - 1] !== "") {
            inputAmounts.push("");
        }

        setPersonalAmountInputs({
            ...personalAmountInputs,
            [userId]: inputAmounts,
        });
        changePersonalExpense(
            userId,
            "amount",
            inputAmounts.reduce(
                (total, amount) => total + Number(amount || 0),
                0,
            ),
        );
    };

    const resetForm = () => {
        setPersonalAmountInputs(
            Object.fromEntries(users.map((user) => [user.id, [""]])),
        );
        setForm({
            spent_at: "",
            user_id: "",
            category_id: "",
            amount: "",
            income: "",
            note: "",
            personal_expenses: users.map((user) => ({
                user_id: user.id,
                amount: "",
                note: "",
            })),
        });
    };

    const cleanAmount = (value) => {
        return value === "" || value === null ? null : Number(value);
    };

    const expensePayload = () => {
        return {
            ...form,
            user_id: Number(form.user_id),
            category_id: Number(form.category_id),
            amount: cleanAmount(form.amount),
            income: isElectricity ? cleanAmount(form.income) : null,
            note: form.note.trim() || null,
            personal_expenses: form.personal_expenses.map((item) => ({
                user_id: Number(item.user_id),
                amount: cleanAmount(item.amount),
                note: item.note.trim() || null,
            })),
        };
    };

    const storeExpense = async (e) => {
        e.preventDefault();

        try {
            const payload = expensePayload();

            await axios.post("/api/expenses", payload);

            resetForm();
            setMessage("支出を登録しました。");
            setError("");
            navigate(`${ROUTES.SUMMARY}?month=${payload.spent_at.slice(0, 7)}`);
        } catch (error) {
            const errors = error.response?.data?.errors;

            setError(
                errors ? Object.values(errors).flat()[0] : "登録に失敗しました。",
            );
            setMessage("");
        }
    };

    const personalTotal = form.personal_expenses.reduce(
        (total, item) => total + Number(item.amount || 0),
        0,
    );
    const isElectricity = categories.find(
        (category) =>
            category.id === Number(form.category_id) &&
            category.is_electricity,
    );
    const netAmount =
        Number(form.amount || 0) -
        (isElectricity ? Number(form.income || 0) : 0);
    const sharedAmount = netAmount - personalTotal;

    return (
        <>
            <Header />
            <main className="expenseContainer">
                <h1 className="expenseTitle">支出登録</h1>

                {message && <p className="expenseMessage">{message}</p>}
                {error && <p className="expenseError">{error}</p>}

                <form className="expenseForm" onSubmit={storeExpense}>
                    <div className="expenseFormGroup">
                        <label htmlFor="spentAt">支払日</label>
                        <div className="expenseDateField">
                            <input
                                id="spentAt"
                                name="spent_at"
                                type="date"
                                value={form.spent_at}
                                onChange={changeForm}
                            />
                        </div>
                    </div>

                    <div className="expenseFormGroup">
                        <label htmlFor="user">支払った人</label>
                        <select
                            id="user"
                            name="user_id"
                            value={form.user_id}
                            onChange={changeForm}
                        >
                            <option value="" disabled>
                                選択してください
                            </option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="expenseFormGroup">
                        <label htmlFor="category">カテゴリ</label>
                        <select
                            id="category"
                            name="category_id"
                            value={form.category_id}
                            onChange={changeForm}
                        >
                            <option value="" disabled>
                                選択してください
                            </option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="expenseFormGroup">
                        <label htmlFor="amount">合計金額</label>
                        <div className="expenseAmount">
                            <input
                                id="amount"
                                name="amount"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={form.amount}
                                onChange={changeForm}
                            />
                            <span>円</span>
                        </div>
                    </div>

                    {isElectricity && (
                        <>
                            <div className="expenseFormGroup">
                                <label htmlFor="income">売電収入</label>
                                <div className="expenseAmount">
                                    <input
                                        id="income"
                                        name="income"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={form.income}
                                        onChange={changeForm}
                                    />
                                    <span>円</span>
                                </div>
                            </div>

                            <div className="netAmount">
                                <span>差引金額</span>
                                <strong>{netAmount.toLocaleString()}円</strong>
                            </div>
                        </>
                    )}

                    <fieldset className="personalExpenseFieldset">
                        <legend>個人分</legend>
                        <p className="personalExpenseDescription">
                            売電収入を引く前の合計金額から、個人で負担する分を入力してください。
                        </p>

                        {users.map((user) => {
                            const personalExpense = form.personal_expenses.find(
                                (item) => item.user_id === user.id,
                            );

                            return (
                                <div
                                    className="personalExpenseRow"
                                    key={user.id}
                                >
                                    <span className="personalExpenseName">
                                        {user.name}
                                    </span>
                                    <div className="personalAmountInputs">
                                        {(personalAmountInputs[user.id] ?? [
                                            "",
                                        ]).map((amount, index) => (
                                            <div
                                                className="expenseAmount"
                                                key={index}
                                            >
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={amount}
                                                    aria-label={`${user.name}の個人分${index + 1}件目`}
                                                    onChange={(e) =>
                                                        changePersonalAmount(
                                                            user.id,
                                                            index,
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <span>円</span>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="内容（任意）"
                                        value={personalExpense?.note ?? ""}
                                        aria-label={`${user.name}の個人分の内容`}
                                        onChange={(e) =>
                                            changePersonalExpense(
                                                user.id,
                                                "note",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            );
                        })}

                        <div className="sharedAmount">
                            <span>共有分</span>
                            <strong>{sharedAmount.toLocaleString()}円</strong>
                        </div>
                    </fieldset>

                    <div className="expenseFormGroup">
                        <label htmlFor="note">メモ</label>
                        <textarea
                            id="note"
                            name="note"
                            rows="3"
                            placeholder="購入場所や内容など（任意）"
                            value={form.note}
                            onChange={changeForm}
                        ></textarea>
                    </div>

                    <button className="expenseStoreButton" type="submit">
                        登録
                    </button>
                </form>
            </main>
        </>
    );
};

export default Expense;
