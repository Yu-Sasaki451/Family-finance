import axios from "axios";
import { Fragment, useEffect, useState } from "react";
import "../../css/pages/Index.css";

const MonthlyExpenseSummary = ({
    title = "月別集計",
    currentMonthOnly = false,
    monthPicker = "cards",
    showCategoryTotals = true,
    showDetailsSection = true,
    showTrendChart = false,
}) => {
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [categoryTotals, setCategoryTotals] = useState([]);
    const [details, setDetails] = useState([]);
    const [settlement, setSettlement] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editingExpense, setEditingExpense] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const getMonthlyExpenses = async (month = "") => {
        try {
            const response = await axios.get("/api/expenses/monthly", {
                params: month ? { month } : {},
            });

            setMonths(response.data.months);
            setSelectedMonth(response.data.selected_month ?? "");
            setCategoryTotals(response.data.category_totals ?? []);
            setDetails(response.data.details);
            setSettlement(response.data.settlement);
            setSelectedCategoryId(null);
            setError("");
        } catch {
            setError("月別集計の取得に失敗しました。");
        }
    };

    const getOptions = async () => {
        try {
            const response = await axios.get("/api/expenses/options");

            setUsers(response.data.users);
            setCategories(response.data.categories);
        } catch {
            setError("変更用の入力項目の取得に失敗しました。");
        }
    };

    const getCurrentMonth = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");

        return `${year}-${month}`;
    };

    useEffect(() => {
        getMonthlyExpenses(currentMonthOnly ? getCurrentMonth() : "");
        getOptions();
    }, [currentMonthOnly]);

    const clearSelectedMonth = () => {
        setSelectedMonth("");
        setCategoryTotals([]);
        setDetails([]);
        setSettlement(null);
        setSelectedCategoryId(null);
    };

    const selectMonth = (month) => {
        if (currentMonthOnly) {
            return;
        }

        setEditingExpense(null);
        setMessage("");
        setShowDetails(false);
        setSelectedCategoryId(null);

        if (selectedMonth === month) {
            clearSelectedMonth();

            return;
        }

        getMonthlyExpenses(month);
    };

    const changeSelectedMonth = (e) => {
        const month = e.target.value;

        setEditingExpense(null);
        setMessage("");
        setShowDetails(false);
        setSelectedCategoryId(null);

        if (!month) {
            clearSelectedMonth();

            return;
        }

        getMonthlyExpenses(month);
    };

    const formatMonth = (month) => {
        const [year, monthNumber] = month.split("-");

        return `${year}年${Number(monthNumber)}月`;
    };

    const formatAmount = (amount) => {
        return `${Number(amount).toLocaleString()}円`;
    };

    const startEditing = (expense) => {
        setEditingExpense({
            id: expense.id,
            spent_at: expense.spent_at,
            user_id: expense.user_id,
            category_id: expense.category_id,
            amount: expense.amount,
            income: expense.income ?? "",
            note: expense.note ?? "",
            personal_expenses: users.map((user) => {
                const personalExpense = expense.personal_expenses.find(
                    (item) => item.user_id === user.id,
                );

                return {
                    user_id: user.id,
                    amount: personalExpense?.amount ?? "",
                    note: personalExpense?.note ?? "",
                };
            }),
        });
        setMessage("");
        setError("");
    };

    const changeEditingExpense = (e) => {
        const value = e.target.value;

        setEditingExpense({
            ...editingExpense,
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
        setEditingExpense({
            ...editingExpense,
            personal_expenses: editingExpense.personal_expenses.map((item) =>
                item.user_id === userId ? { ...item, [name]: value } : item,
            ),
        });
    };

    const getErrorMessage = (requestError, defaultMessage) => {
        const errors = requestError.response?.data?.errors;

        return errors ? Object.values(errors).flat()[0] : defaultMessage;
    };

    const updateExpense = async (e) => {
        e.preventDefault();

        try {
            await axios.put(
                `/api/expenses/${editingExpense.id}`,
                editingExpense,
            );

            setEditingExpense(null);
            setMessage("登録内容を変更しました。");
            await getMonthlyExpenses(selectedMonth);
        } catch (requestError) {
            setError(getErrorMessage(requestError, "変更に失敗しました。"));
            setMessage("");
        }
    };

    const deleteExpense = async (expense) => {
        if (
            !window.confirm(
                `${expense.spent_at}の${expense.category}を削除しますか？`,
            )
        ) {
            return;
        }

        try {
            await axios.delete(`/api/expenses/${expense.id}`);

            setEditingExpense(null);
            setMessage("登録内容を削除しました。");
            await getMonthlyExpenses(selectedMonth);
        } catch {
            setError("削除に失敗しました。");
            setMessage("");
        }
    };

    const isSelectedCategory = (categoryId) => {
        return (
            selectedCategoryId !== null &&
            String(selectedCategoryId) === String(categoryId)
        );
    };

    const toggleCategoryDetails = (categoryId) => {
        setSelectedCategoryId(isSelectedCategory(categoryId) ? null : categoryId);
        setShowDetails(false);
        setEditingExpense(null);
    };

    const isEditingElectricity = categories.find(
        (category) =>
            category.id === Number(editingExpense?.category_id) &&
            category.is_electricity,
    );

    const displayedMonths = currentMonthOnly
        ? months.filter((month) => month.month === selectedMonth)
        : months;
    const selectedMonthSummary = months.find(
        (month) => month.month === selectedMonth,
    );
    const hasSelectedMonthExpenses =
        categoryTotals.length > 0 || details.length > 0;
    const chartYear = selectedMonth
        ? selectedMonth.slice(0, 4)
        : (months[0]?.month?.slice(0, 4) ?? String(new Date().getFullYear()));
    const chartMonths = Array.from({ length: 12 }, (_, index) => {
        const monthNumber = String(index + 1).padStart(2, "0");
        const monthKey = `${chartYear}-${monthNumber}`;

        return (
            months.find((month) => month.month === monthKey) ?? {
                month: monthKey,
                total: 0,
            }
        );
    });
    const maxMonthlyTotal = Math.max(
        ...chartMonths.map((month) => Math.max(month.total, 0)),
        1,
    );
    const selectedCategoryTotal = categoryTotals.find(
        (categoryTotal) => isSelectedCategory(categoryTotal.category_id),
    );
    const selectedCategoryDetails = selectedCategoryId
        ? details.filter((expense) => isSelectedCategory(expense.category_id))
        : [];

    return (
        <main
            className={`indexContainer ${
                currentMonthOnly ? "topSummaryContainer" : ""
            }`}
        >
            {title && <h1 className="indexTitle">{title}</h1>}

            {message && <p className="indexMessage">{message}</p>}
            {error && <p className="indexError">{error}</p>}

            {currentMonthOnly && selectedMonthSummary && (
                <section className="currentMonthPanel">
                    <div className="currentMonthHeader">
                        <span>{formatMonth(selectedMonthSummary.month)}</span>
                        <strong>{formatAmount(selectedMonthSummary.total)}</strong>
                    </div>

                    <div className="currentMonthStats">
                        <div>
                            <span>支出</span>
                            <strong>
                                {formatAmount(selectedMonthSummary.expense_total)}
                            </strong>
                        </div>
                        <div>
                            <span>売電</span>
                            <strong>
                                {formatAmount(selectedMonthSummary.income_total)}
                            </strong>
                        </div>
                        <div>
                            <span>件数</span>
                            <strong>{selectedMonthSummary.count}件</strong>
                        </div>
                    </div>
                </section>
            )}

            {showTrendChart && chartMonths.length > 0 && (
                <section className="monthlyTrendSection">
                    <div className="monthlyTrendHeader">
                        <h2>{chartYear}年の月毎推移</h2>
                        <span>1月から12月まで表示</span>
                    </div>
                    <div className="monthlyTrendChart">
                        {chartMonths.map((month) => {
                            const barHeight =
                                month.total > 0
                                    ? Math.max(
                                          8,
                                          (month.total / maxMonthlyTotal) *
                                              100,
                                      )
                                    : 0;
                            const monthNumber = Number(
                                month.month.split("-")[1],
                            );

                            return (
                                <div
                                    className="monthlyTrendItem"
                                    key={month.month}
                                >
                                    <strong>{formatAmount(month.total)}</strong>
                                    <div className="monthlyTrendBarFrame">
                                        <div
                                            className={`monthlyTrendBar ${
                                                month.total === 0
                                                    ? "zeroTrendBar"
                                                    : ""
                                            }`}
                                            style={{
                                                height: `${barHeight}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <span>{monthNumber}月</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {!currentMonthOnly && monthPicker === "select" && (
                <section className="monthSelectSection">
                    <label className="monthSelectLabel">
                        表示する月
                        <select
                            className="monthSelect"
                            value={selectedMonth}
                            onChange={changeSelectedMonth}
                        >
                            <option value="">月を選択してください</option>
                            {months.map((month) => (
                                <option key={month.month} value={month.month}>
                                    {formatMonth(month.month)}
                                </option>
                            ))}
                        </select>
                    </label>
                </section>
            )}

            {!currentMonthOnly &&
                monthPicker === "cards" &&
                displayedMonths.length > 0 && (
                <section className="monthSummaryGrid">
                    {displayedMonths.map((month) => (
                        <button
                            className={`monthSummaryCard ${
                                selectedMonth === month.month
                                    ? "selectedMonth"
                                    : ""
                            }`}
                            type="button"
                            key={month.month}
                            onClick={() => selectMonth(month.month)}
                        >
                            <span>{formatMonth(month.month)}</span>
                            <strong>{formatAmount(month.total)}</strong>
                            <small>
                                支出 {formatAmount(month.expense_total)} / 売電{" "}
                                {formatAmount(month.income_total)}
                            </small>
                            <small>{month.count}件</small>
                        </button>
                    ))}
                </section>
            )}

            {selectedMonth && (showCategoryTotals || showDetailsSection) && (
                <section className="monthlyDetails">
                    {showCategoryTotals && (
                        <>
                            <h2>{formatMonth(selectedMonth)}のカテゴリ別集計</h2>

                            {categoryTotals.length > 0 ? (
                                <>
                                    <div className="categoryGrandTotal">
                                        <span>合計</span>
                                        <strong>
                                            {formatAmount(
                                                selectedMonthSummary?.total ??
                                                    0,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="categoryTotalGrid">
                                        {categoryTotals.map((categoryTotal) => (
                                            <Fragment
                                                key={categoryTotal.category_id}
                                            >
                                                <div
                                                    className="categoryTotalCard"
                                                >
                                                    <div>
                                                        <span>
                                                            {
                                                                categoryTotal.category
                                                            }
                                                        </span>
                                                        <strong>
                                                            {formatAmount(
                                                                categoryTotal.total,
                                                            )}
                                                        </strong>
                                                    </div>
                                                    <button
                                                        className="categoryDetailButton"
                                                        type="button"
                                                        onClick={() =>
                                                            toggleCategoryDetails(
                                                                categoryTotal.category_id,
                                                            )
                                                        }
                                                    >
                                                        {isSelectedCategory(
                                                            categoryTotal.category_id,
                                                        )
                                                            ? "詳細を閉じる"
                                                            : "詳細を見る"}
                                                    </button>
                                                </div>

                                                {isSelectedCategory(
                                                    categoryTotal.category_id,
                                                ) && (
                                                    <div className="categoryDetailSection">
                                                        <h3>
                                                            {formatMonth(
                                                                selectedMonth,
                                                            )}
                                                            の
                                                            {
                                                                categoryTotal.category
                                                            }
                                                            詳細
                                                        </h3>

                                                        {selectedCategoryDetails.length >
                                                        0 ? (
                                                            <table className="monthlyDetailsTable">
                                                                <thead>
                                                                    <tr>
                                                                        <th>
                                                                            日付
                                                                        </th>
                                                                        <th>
                                                                            支払者
                                                                        </th>
                                                                        <th>
                                                                            合計金額
                                                                        </th>
                                                                        <th>
                                                                            売電収入
                                                                        </th>
                                                                        <th>
                                                                            差引金額
                                                                        </th>
                                                                        <th>
                                                                            個人分
                                                                        </th>
                                                                        <th>
                                                                            共有分
                                                                        </th>
                                                                        <th>
                                                                            メモ
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedCategoryDetails.map(
                                                                        (
                                                                            expense,
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    expense.id
                                                                                }
                                                                            >
                                                                                <td data-label="日付">
                                                                                    {
                                                                                        expense.spent_at
                                                                                    }
                                                                                </td>
                                                                                <td data-label="支払者">
                                                                                    {
                                                                                        expense.user
                                                                                    }
                                                                                </td>
                                                                                <td data-label="合計金額">
                                                                                    {formatAmount(
                                                                                        expense.amount,
                                                                                    )}
                                                                                </td>
                                                                                <td data-label="売電収入">
                                                                                    {expense.income
                                                                                        ? formatAmount(
                                                                                              expense.income,
                                                                                          )
                                                                                        : "-"}
                                                                                </td>
                                                                                <td data-label="差引金額">
                                                                                    {formatAmount(
                                                                                        expense.net_amount,
                                                                                    )}
                                                                                </td>
                                                                                <td data-label="個人分">
                                                                                    {expense
                                                                                        .personal_expenses
                                                                                        .length >
                                                                                    0
                                                                                        ? expense.personal_expenses.map(
                                                                                              (
                                                                                                  item,
                                                                                              ) => (
                                                                                                  <div
                                                                                                      key={`${expense.id}-${item.user}`}
                                                                                                  >
                                                                                                      {
                                                                                                          item.user
                                                                                                      }
                                                                                                      :{" "}
                                                                                                      {formatAmount(
                                                                                                          item.amount,
                                                                                                      )}
                                                                                                      {item.note &&
                                                                                                          `（${item.note}）`}
                                                                                                  </div>
                                                                                              ),
                                                                                          )
                                                                                        : "-"}
                                                                                </td>
                                                                                <td data-label="共有分">
                                                                                    {formatAmount(
                                                                                        expense.shared_amount,
                                                                                    )}
                                                                                </td>
                                                                                <td data-label="メモ">
                                                                                    {expense.note ||
                                                                                        "-"}
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <p className="noExpenses">
                                                                このカテゴリの詳細はありません。
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </Fragment>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="noExpenses">
                                    この月の支出はありません。
                                </p>
                            )}
                        </>
                    )}

                    {showDetailsSection && hasSelectedMonthExpenses && (
                        <div className="monthlyDetailButtonArea">
                            <button
                                className="monthlyDetailButton"
                                type="button"
                                onClick={() => {
                                    setShowDetails(!showDetails);
                                    setEditingExpense(null);
                                }}
                            >
                                {showDetails ? "詳細を閉じる" : "詳細を表示"}
                            </button>
                        </div>
                    )}

                    {showDetailsSection && showDetails && (
                        <>
                            <h2>{formatMonth(selectedMonth)}の詳細</h2>

                            {settlement?.error && (
                                <p className="settlementError">
                                    {settlement.error}
                                </p>
                            )}

                            {settlement && !settlement.error && (
                                <div className="settlementBox">
                                    <h3>この月に必要な精算</h3>
                                    <p className="settlementDescription">
                                        立て替えた金額と、本来それぞれが負担する金額を比べた結果です。
                                    </p>
                                    <p className="transferResult">
                                        {settlement.transfer
                                            ? `${settlement.transfer.from}が${settlement.transfer.to}へ ${formatAmount(settlement.transfer.amount)} 支払う`
                                            : "お互いの負担額が一致しているため、支払いはありません。"}
                                    </p>

                                    <div className="settlementUsers">
                                        {settlement.users.map((user) => (
                                            <div
                                                className="settlementUser"
                                                key={user.id}
                                            >
                                                <strong>{user.name}</strong>
                                                <span>
                                                    実際に支払った合計：
                                                    {formatAmount(user.paid)}
                                                </span>
                                                <span>
                                                    本来負担する合計：
                                                    {formatAmount(user.burden)}
                                                </span>
                                                <span>
                                                    過不足：
                                                    {user.difference >= 0
                                                        ? `${formatAmount(user.difference)} 立て替え中`
                                                        : `${formatAmount(Math.abs(user.difference))} 支払い不足`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <table className="monthlyDetailsTable">
                                <thead>
                                    <tr>
                                        <th>日付</th>
                                        <th>カテゴリ</th>
                                        <th>支払者</th>
                                        <th>合計金額</th>
                                        <th>売電収入</th>
                                        <th>差引金額</th>
                                        <th>個人分</th>
                                        <th>共有分</th>
                                        <th>メモ</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.map((expense) => (
                                        <Fragment key={expense.id}>
                                            <tr>
                                                <td data-label="日付">
                                                    {expense.spent_at}
                                                </td>
                                                <td data-label="カテゴリ">
                                                    {expense.category}
                                                </td>
                                                <td data-label="支払者">
                                                    {expense.user}
                                                </td>
                                                <td data-label="合計金額">
                                                    {formatAmount(
                                                        expense.amount,
                                                    )}
                                                </td>
                                                <td data-label="売電収入">
                                                    {expense.income
                                                        ? formatAmount(
                                                              expense.income,
                                                          )
                                                        : "-"}
                                                </td>
                                                <td data-label="差引金額">
                                                    {formatAmount(
                                                        expense.net_amount,
                                                    )}
                                                </td>
                                                <td data-label="個人分">
                                                    {expense.personal_expenses
                                                        .length > 0
                                                        ? expense.personal_expenses.map(
                                                              (item) => (
                                                                  <div
                                                                      key={`${expense.id}-${item.user}`}
                                                                  >
                                                                      {
                                                                          item.user
                                                                      }
                                                                      :{" "}
                                                                      {formatAmount(
                                                                          item.amount,
                                                                      )}
                                                                      {item.note &&
                                                                          `（${item.note}）`}
                                                                  </div>
                                                              ),
                                                          )
                                                        : "-"}
                                                </td>
                                                <td data-label="共有分">
                                                    {formatAmount(
                                                        expense.shared_amount,
                                                    )}
                                                </td>
                                                <td data-label="メモ">
                                                    {expense.note || "-"}
                                                </td>
                                                <td data-label="操作">
                                                    <div className="expenseActions">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEditing(
                                                                    expense,
                                                                )
                                                            }
                                                        >
                                                            変更
                                                        </button>
                                                        <button
                                                            className="deleteExpenseButton"
                                                            type="button"
                                                            onClick={() =>
                                                                deleteExpense(
                                                                    expense,
                                                                )
                                                            }
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                                {editingExpense?.id ===
                                                    expense.id && (
                                                    <tr className="editExpenseRow">
                                                        <td colSpan="10">
                                                            <form
                                                                className="editExpenseForm"
                                                                onSubmit={
                                                                    updateExpense
                                                                }
                                                            >
                                                                <h3>
                                                                    登録内容の変更
                                                                </h3>
                                                                <label>
                                                                    支払日
                                                                    <input
                                                                        name="spent_at"
                                                                        type="date"
                                                                        value={
                                                                            editingExpense.spent_at
                                                                        }
                                                                        onChange={
                                                                            changeEditingExpense
                                                                        }
                                                                    />
                                                                </label>
                                                                <label>
                                                                    支払った人
                                                                    <select
                                                                        name="user_id"
                                                                        value={
                                                                            editingExpense.user_id
                                                                        }
                                                                        onChange={
                                                                            changeEditingExpense
                                                                        }
                                                                    >
                                                                        {users.map(
                                                                            (
                                                                                user,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        user.id
                                                                                    }
                                                                                    value={
                                                                                        user.id
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        user.name
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                </label>
                                                                <label>
                                                                    カテゴリ
                                                                    <select
                                                                        name="category_id"
                                                                        value={
                                                                            editingExpense.category_id
                                                                        }
                                                                        onChange={
                                                                            changeEditingExpense
                                                                        }
                                                                    >
                                                                        {categories.map(
                                                                            (
                                                                                category,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        category.id
                                                                                    }
                                                                                    value={
                                                                                        category.id
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        category.name
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                </label>
                                                                <label>
                                                                    合計金額
                                                                    <input
                                                                        name="amount"
                                                                        type="number"
                                                                        min="1"
                                                                        value={
                                                                            editingExpense.amount
                                                                        }
                                                                        onChange={
                                                                            changeEditingExpense
                                                                        }
                                                                    />
                                                                </label>
                                                                {isEditingElectricity && (
                                                                    <label>
                                                                        売電収入
                                                                        <input
                                                                            name="income"
                                                                            type="number"
                                                                            min="0"
                                                                            value={
                                                                                editingExpense.income
                                                                            }
                                                                            onChange={
                                                                                changeEditingExpense
                                                                            }
                                                                        />
                                                                    </label>
                                                                )}
                                                                <label>
                                                                    メモ
                                                                    <input
                                                                        name="note"
                                                                        type="text"
                                                                        value={
                                                                            editingExpense.note
                                                                        }
                                                                        onChange={
                                                                            changeEditingExpense
                                                                        }
                                                                    />
                                                                </label>

                                                                <fieldset>
                                                                    <legend>
                                                                        個人分
                                                                    </legend>
                                                                    {users.map(
                                                                        (
                                                                            user,
                                                                        ) => {
                                                                            const personalExpense =
                                                                                editingExpense.personal_expenses.find(
                                                                                    (
                                                                                        item,
                                                                                    ) =>
                                                                                        item.user_id ===
                                                                                        user.id,
                                                                                );

                                                                            return (
                                                                                <div
                                                                                    className="editPersonalExpense"
                                                                                    key={
                                                                                        user.id
                                                                                    }
                                                                                >
                                                                                    <strong>
                                                                                        {
                                                                                            user.name
                                                                                        }
                                                                                    </strong>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        placeholder="金額"
                                                                                        value={
                                                                                            personalExpense?.amount ??
                                                                                            ""
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            changePersonalExpense(
                                                                                                user.id,
                                                                                                "amount",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="内容（任意）"
                                                                                        value={
                                                                                            personalExpense?.note ??
                                                                                            ""
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            changePersonalExpense(
                                                                                                user.id,
                                                                                                "note",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </fieldset>

                                                                <div className="editExpenseButtons">
                                                                    <button type="submit">
                                                                        変更を保存
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setEditingExpense(
                                                                                null,
                                                                            )
                                                                        }
                                                                    >
                                                                        キャンセル
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        </td>
                                                    </tr>
                                                )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </section>
            )}

            {!selectedMonth && displayedMonths.length === 0 && !error && (
                <p className="noExpenses">登録済みの支出はありません。</p>
            )}
        </main>
    );
};

export default MonthlyExpenseSummary;
