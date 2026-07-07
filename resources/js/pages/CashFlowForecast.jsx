import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import "../../css/pages/CashFlowForecast.css";
import Header from "../components/Header";

const getCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
};

const buildMonths = (startMonth) => {
    const [year, month] = startMonth.split("-").map(Number);

    return Array.from({ length: 3 }, (_, index) => {
        const date = new Date(year, month - 1 + index, 1);
        const forecastYear = date.getFullYear();
        const forecastMonth = String(date.getMonth() + 1).padStart(2, "0");

        return `${forecastYear}-${forecastMonth}`;
    });
};

const formatMonth = (month) => {
    const [year, monthNumber] = month.split("-");

    return `${year}年${Number(monthNumber)}月`;
};

const formatAmount = (amount) => {
    return `${Number(amount || 0).toLocaleString()}円`;
};

const emptyAmounts = (months) => {
    return months.map((month) => ({
        month,
        amount: "",
    }));
};

const emptyItem = (months) => ({
    title: "",
    same_amount: true,
    amounts: emptyAmounts(months),
});

const emptySimulationItem = () => ({
    title: "",
    amount: "",
});

const emptySimulation = () => ({
    incomes: [emptySimulationItem()],
    fixed_expenses: [emptySimulationItem()],
    variable_expenses: [emptySimulationItem()],
});

const emptySimulations = () => ({
    personal: emptySimulation(),
    group: emptySimulation(),
});

const alignAmounts = (amounts, months) => {
    return months.map((month, index) => {
        const amount = amounts.find((item) => item.month === month)?.amount;

        return {
            month,
            amount: amount ?? amounts[index]?.amount ?? "",
        };
    });
};

const sameAmountForAllMonths = (item, months) => {
    const amounts = item.amounts ?? [];
    const amount =
        amounts.find((amount) => String(amount.amount ?? "") !== "")
            ?.amount ?? "";

    return months.map((month) => ({
        month,
        amount,
    }));
};

const alignItems = (items, months, fixedAmount = false) => {
    if (!items.length) {
        return [emptyItem(months)];
    }

    return items.map((item) => ({
        title: item.title ?? "",
        same_amount: fixedAmount,
        amounts: fixedAmount
            ? sameAmountForAllMonths(item, months)
            : alignAmounts(item.amounts ?? [], months),
    }));
};

const alignSimulationItems = (items = []) => {
    if (!items.length) {
        return [emptySimulationItem()];
    }

    return items.map((item) => ({
        title: item.title ?? "",
        amount: item.amount ?? "",
    }));
};

const emptyForm = (scope) => {
    const startMonth = getCurrentMonth();
    const months = buildMonths(startMonth);

    return {
        scope,
        start_month: startMonth,
        current_balance: "",
        fixed_incomes: [emptyItem(months)],
        variable_incomes: [emptyItem(months)],
        fixed_expenses: [emptyItem(months)],
        variable_expenses: [emptyItem(months)],
    };
};

const rowHasValue = (item) => {
    return (
        item.title.trim() !== "" ||
        item.amounts.some((amount) => String(amount.amount ?? "") !== "")
    );
};

const cleanAmount = (amount) => {
    return amount === "" || amount === null ? null : Number(amount);
};

const cleanItems = (items, fixedAmount = false) => {
    return items.filter(rowHasValue).map((item) => ({
        title: item.title,
        same_amount: fixedAmount,
        amounts: (fixedAmount
            ? item.amounts.map((amount) => ({
                  ...amount,
                  amount: item.amounts[0]?.amount ?? "",
              }))
            : item.amounts
        ).map((amount) => ({
            month: amount.month,
            amount: cleanAmount(amount.amount),
        })),
    }));
};

const simulationRowHasValue = (item) => {
    return item.title.trim() !== "" || String(item.amount ?? "") !== "";
};

const cleanSimulationItems = (items) => {
    return items.filter(simulationRowHasValue).map((item) => ({
        title: item.title,
        amount: cleanAmount(item.amount),
    }));
};

const CashFlowForecast = () => {
    const [mode, setMode] = useState("simulation");
    const [simulationScope, setSimulationScope] = useState("personal");
    const [form, setForm] = useState(emptyForm("personal"));
    const [simulations, setSimulations] = useState(emptySimulations());
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const simulation = simulations[simulationScope];

    const months = useMemo(
        () => buildMonths(form.start_month),
        [form.start_month],
    );

    const getForecast = async (scope = form.scope) => {
        try {
            const response = await axios.get("/api/cash-flow-forecast", {
                params: { scope },
            });
            const startMonth = response.data.start_month ?? getCurrentMonth();
            const forecastMonths = buildMonths(startMonth);

            setForm({
                scope,
                start_month: startMonth,
                current_balance: response.data.current_balance ?? "",
                fixed_incomes: alignItems(
                    response.data.fixed_incomes ?? [],
                    forecastMonths,
                    true,
                ),
                variable_incomes: alignItems(
                    response.data.variable_incomes ?? [],
                    forecastMonths,
                ),
                fixed_expenses: alignItems(
                    response.data.fixed_expenses ?? [],
                    forecastMonths,
                    true,
                ),
                variable_expenses: alignItems(
                    response.data.variable_expenses ?? [],
                    forecastMonths,
                ),
            });
            setSimulations((current) => ({
                ...current,
                [scope]: {
                    incomes: alignSimulationItems(
                        response.data.simulation_incomes ?? [],
                    ),
                    fixed_expenses: alignSimulationItems(
                        response.data.simulation_fixed_expenses ?? [],
                    ),
                    variable_expenses: alignSimulationItems(
                        response.data.simulation_variable_expenses ?? [],
                    ),
                },
            }));
        } catch {
            setForm((current) => ({
                ...emptyForm(scope),
                current_balance:
                    current.scope === scope ? current.current_balance : "",
            }));
            setSimulations((current) => ({
                ...current,
                [scope]: emptySimulation(),
            }));
            setError("");
        }
    };

    const getSimulation = async (scope) => {
        try {
            const response = await axios.get("/api/cash-flow-forecast", {
                params: { scope },
            });

            setSimulations((current) => ({
                ...current,
                [scope]: {
                    incomes: alignSimulationItems(
                        response.data.simulation_incomes ?? [],
                    ),
                    fixed_expenses: alignSimulationItems(
                        response.data.simulation_fixed_expenses ?? [],
                    ),
                    variable_expenses: alignSimulationItems(
                        response.data.simulation_variable_expenses ?? [],
                    ),
                },
            }));
        } catch {
            setSimulations((current) => ({
                ...current,
                [scope]: emptySimulation(),
            }));
        }
    };

    useEffect(() => {
        getForecast("personal");
        getSimulation("group");
    }, []);

    const changeScope = (scope) => {
        setMessage("");
        setError("");
        setForm(emptyForm(scope));
        getForecast(scope);
    };

    const changeStartMonth = (value) => {
        const nextMonths = buildMonths(value);

        setForm({
            ...form,
            start_month: value,
            fixed_incomes: alignItems(form.fixed_incomes, nextMonths, true),
            variable_incomes: alignItems(form.variable_incomes, nextMonths),
            fixed_expenses: alignItems(
                form.fixed_expenses,
                nextMonths,
                true,
            ),
            variable_expenses: alignItems(
                form.variable_expenses,
                nextMonths,
            ),
        });
    };

    const changeCurrentBalance = (value) => {
        setForm({
            ...form,
            current_balance: value,
        });
    };

    const changeSimulationItem = (type, itemIndex, field, value) => {
        setSimulations((current) => {
            const currentSimulation = current[simulationScope];

            return {
                ...current,
                [simulationScope]: {
                    ...currentSimulation,
                    [type]: currentSimulation[type].map((item, index) =>
                        index === itemIndex
                            ? { ...item, [field]: value }
                            : item,
                    ),
                },
            };
        });
    };

    const addSimulationItem = (type) => {
        setSimulations((current) => {
            const currentSimulation = current[simulationScope];

            return {
                ...current,
                [simulationScope]: {
                    ...currentSimulation,
                    [type]: [
                        ...currentSimulation[type],
                        emptySimulationItem(),
                    ],
                },
            };
        });
    };

    const removeSimulationItem = (type, itemIndex) => {
        const nextItems = simulation[type].filter(
            (_, index) => index !== itemIndex,
        );

        setSimulations((current) => ({
            ...current,
            [simulationScope]: {
                ...current[simulationScope],
                [type]: nextItems.length
                    ? nextItems
                    : [emptySimulationItem()],
            },
        }));
    };

    const changeItemTitle = (type, itemIndex, value) => {
        setForm({
            ...form,
            [type]: form[type].map((item, index) =>
                index === itemIndex ? { ...item, title: value } : item,
            ),
        });
    };

    const changeItemAmount = (type, itemIndex, monthIndex, value) => {
        setForm({
            ...form,
            [type]: form[type].map((item, index) => {
                if (index !== itemIndex) {
                    return item;
                }

                const nextAmounts = item.amounts.map((amount, amountIndex) => {
                    if (
                        type === "fixed_incomes" ||
                        type === "fixed_expenses"
                    ) {
                        return { ...amount, amount: value };
                    }

                    return amountIndex === monthIndex
                        ? { ...amount, amount: value }
                        : amount;
                });

                return { ...item, amounts: nextAmounts };
            }),
        });
    };

    const addItem = (type) => {
        setForm({
            ...form,
            [type]: [...form[type], emptyItem(months)],
        });
    };

    const removeItem = (type, itemIndex) => {
        const nextItems = form[type].filter((_, index) => index !== itemIndex);

        setForm({
            ...form,
            [type]: nextItems.length ? nextItems : [emptyItem(months)],
        });
    };

    const monthTotals = months.reduce((totals, month, index) => {
        const startBalance =
            index === 0
                ? Number(form.current_balance || 0)
                : totals[index - 1].remaining;
        const fixedIncomeTotal = form.fixed_incomes.reduce(
            (total, item) => total + Number(item.amounts[index]?.amount || 0),
            0,
        );
        const variableIncomeTotal = form.variable_incomes.reduce(
            (total, item) => total + Number(item.amounts[index]?.amount || 0),
            0,
        );
        const fixedTotal = form.fixed_expenses.reduce(
            (total, item) => total + Number(item.amounts[index]?.amount || 0),
            0,
        );
        const variableTotal = form.variable_expenses.reduce(
            (total, item) => total + Number(item.amounts[index]?.amount || 0),
            0,
        );
        const incomeTotal = fixedIncomeTotal + variableIncomeTotal;
        const expenseTotal = fixedTotal + variableTotal;

        totals.push({
            month,
            startBalance,
            fixedIncomeTotal,
            variableIncomeTotal,
            incomeTotal,
            fixedTotal,
            variableTotal,
            expenseTotal,
            remaining: startBalance + incomeTotal - expenseTotal,
        });

        return totals;
    }, []);

    const sumSimulationItems = (items) => {
        return items.reduce(
            (total, item) => total + Number(item.amount || 0),
            0,
        );
    };

    const simulationTotal = {
        income: sumSimulationItems(simulation.incomes),
        fixedExpense: sumSimulationItems(simulation.fixed_expenses),
        variableExpense: sumSimulationItems(simulation.variable_expenses),
    };
    simulationTotal.remaining =
        simulationTotal.income -
        simulationTotal.fixedExpense -
        simulationTotal.variableExpense;

    const getErrorMessage = (requestError) => {
        const errors = requestError.response?.data?.errors;

        return errors
            ? Object.values(errors).flat()[0]
            : requestError.response?.status === 500
              ? "保存用テーブルが未作成です。マイグレーションを実行してください。"
              : "収支計算の保存に失敗しました。";
    };

    const saveForecast = async (e) => {
        e.preventDefault();

        try {
            await axios.put("/api/cash-flow-forecast", {
                scope: form.scope,
                start_month: form.start_month,
                current_balance: cleanAmount(form.current_balance),
                fixed_incomes: cleanItems(form.fixed_incomes, true),
                variable_incomes: cleanItems(form.variable_incomes),
                fixed_expenses: cleanItems(form.fixed_expenses, true),
                variable_expenses: cleanItems(form.variable_expenses),
            });

            setMessage("収支計算を保存しました。");
            setError("");
            await getForecast();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
            setMessage("");
        }
    };

    const saveSimulation = async () => {
        try {
            await axios.put("/api/cash-flow-forecast/simulation", {
                scope: simulationScope,
                incomes: cleanSimulationItems(simulation.incomes),
                fixed_expenses: cleanSimulationItems(
                    simulation.fixed_expenses,
                ),
                variable_expenses: cleanSimulationItems(
                    simulation.variable_expenses,
                ),
            });

            setMessage("1ヶ月シミュレーションを保存しました。");
            setError("");
            await getSimulation(simulationScope);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
            setMessage("");
        }
    };

    const renderSimulationRows = (type) => {
        const labels = {
            incomes: "収入",
            fixed_expenses: "固定費",
            variable_expenses: "変動費",
        };
        const title = labels[type];

        return (
            <section className="forecastSection">
                <div className="forecastSectionHeader">
                    <h2>{title}</h2>
                    <button
                        type="button"
                        onClick={() => addSimulationItem(type)}
                    >
                        行を追加
                    </button>
                </div>

                <div className="forecastTable">
                    <div className="forecastTableHeader simulationTableRow">
                        <span>見出し名</span>
                        <span>金額</span>
                        <span>操作</span>
                    </div>

                    {simulation[type].map((item, itemIndex) => (
                        <div
                            className="forecastTableRow simulationTableRow"
                            key={itemIndex}
                        >
                            <input
                                type="text"
                                placeholder={`${title}の見出し名`}
                                value={item.title}
                                onChange={(e) =>
                                    changeSimulationItem(
                                        type,
                                        itemIndex,
                                        "title",
                                        e.target.value,
                                    )
                                }
                            />
                            <label className="forecastMonthAmount">
                                <div className="forecastAmountField">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={item.amount}
                                        onChange={(e) =>
                                            changeSimulationItem(
                                                type,
                                                itemIndex,
                                                "amount",
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <span>円</span>
                                </div>
                            </label>
                            <button
                                className="forecastDeleteButton"
                                type="button"
                                onClick={() =>
                                    removeSimulationItem(type, itemIndex)
                                }
                            >
                                削除
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderExpenseRows = (type) => {
        const labels = {
            fixed_incomes: "固定収入",
            variable_incomes: "変動収入",
            fixed_expenses: "固定支出",
            variable_expenses: "変動支出",
        };
        const title = labels[type];
        const isFixedAmount =
            type === "fixed_incomes" || type === "fixed_expenses";

        return (
            <section className="forecastSection">
                <div className="forecastSectionHeader">
                    <h2>{title}</h2>
                    <button type="button" onClick={() => addItem(type)}>
                        行を追加
                    </button>
                </div>

                <div className="forecastTable">
                    <div
                        className={`forecastTableHeader ${
                            isFixedAmount
                                ? "fixedForecastRow"
                                : "variableForecastRow"
                        }`}
                    >
                        <span>見出し名</span>
                        {isFixedAmount ? (
                            <span>毎月の金額</span>
                        ) : (
                            months.map((month) => (
                                <span key={month}>{formatMonth(month)}</span>
                            ))
                        )}
                        <span>操作</span>
                    </div>

                    {form[type].map((item, itemIndex) => (
                        <div
                            className={`forecastTableRow ${
                                isFixedAmount
                                    ? "fixedForecastRow"
                                    : "variableForecastRow"
                            }`}
                            key={itemIndex}
                        >
                            <input
                                type="text"
                                placeholder={`${title}の見出し名`}
                                value={item.title}
                                onChange={(e) =>
                                    changeItemTitle(
                                        type,
                                        itemIndex,
                                        e.target.value,
                                    )
                                }
                            />
                            {(isFixedAmount
                                ? item.amounts.slice(0, 1)
                                : item.amounts
                            ).map((amount, monthIndex) => (
                                <label
                                    className="forecastMonthAmount"
                                    key={amount.month}
                                >
                                    {!isFixedAmount && (
                                        <span className="forecastMonthName">
                                            {formatMonth(amount.month)}
                                        </span>
                                    )}
                                    <div className="forecastAmountField">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={amount.amount ?? ""}
                                            onChange={(e) =>
                                                changeItemAmount(
                                                    type,
                                                    itemIndex,
                                                    monthIndex,
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <span>円</span>
                                    </div>
                                </label>
                            ))}
                            <button
                                className="forecastDeleteButton"
                                type="button"
                                onClick={() => removeItem(type, itemIndex)}
                            >
                                削除
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    return (
        <>
            <Header />
            <main className="forecastContainer">
                <h1 className="forecastTitle">収支計算</h1>

                {message && <p className="forecastMessage">{message}</p>}
                {error && <p className="forecastError">{error}</p>}

                <section className="forecastModeSection">
                    <button
                        className={mode === "simulation" ? "selectedMode" : ""}
                        type="button"
                        onClick={() => setMode("simulation")}
                    >
                        1ヶ月シミュレーション
                    </button>
                    <button
                        className={mode === "forecast" ? "selectedMode" : ""}
                        type="button"
                        onClick={() => setMode("forecast")}
                    >
                        3ヶ月予測
                    </button>
                </section>

                {mode === "simulation" && (
                    <>
                        <section className="forecastSection">
                            <h2>計算方法</h2>
                            <div className="forecastScopeButtons">
                                <button
                                    className={
                                        simulationScope === "personal"
                                            ? "selectedScopeButton"
                                            : ""
                                    }
                                    type="button"
                                    onClick={() =>
                                        setSimulationScope("personal")
                                    }
                                >
                                    個人で計算
                                </button>
                                <button
                                    className={
                                        simulationScope === "group"
                                            ? "selectedScopeButton"
                                            : ""
                                    }
                                    type="button"
                                    onClick={() => setSimulationScope("group")}
                                >
                                    グループで計算
                                </button>
                            </div>
                        </section>

                        {renderSimulationRows("incomes")}
                        {renderSimulationRows("fixed_expenses")}
                        {renderSimulationRows("variable_expenses")}

                        <section className="forecastSection">
                            <h2>計算結果</h2>
                            <div className="simulationSummary">
                                <span>
                                    収入合計：
                                    {formatAmount(simulationTotal.income)}
                                </span>
                                <span>
                                    固定費合計：
                                    {formatAmount(
                                        simulationTotal.fixedExpense,
                                    )}
                                </span>
                                <span>
                                    変動費合計：
                                    {formatAmount(
                                        simulationTotal.variableExpense,
                                    )}
                                </span>
                                <b
                                    className={
                                        simulationTotal.remaining < 0
                                            ? "minusResult"
                                            : ""
                                    }
                                >
                                    手元に残るお金：
                                    {formatAmount(simulationTotal.remaining)}
                                </b>
                            </div>
                        </section>

                        <div className="forecastSaveArea">
                            <button
                                className="forecastSaveButton"
                                type="button"
                                onClick={saveSimulation}
                            >
                                保存
                            </button>
                        </div>
                    </>
                )}

                {mode === "forecast" && (
                    <form onSubmit={saveForecast}>
                        <section className="forecastSection">
                            <h2>計算方法</h2>
                            <div className="forecastScopeButtons">
                                <button
                                    className={
                                        form.scope === "personal"
                                            ? "selectedScopeButton"
                                            : ""
                                    }
                                    type="button"
                                    onClick={() => changeScope("personal")}
                                >
                                    個人で計算
                                </button>
                                <button
                                    className={
                                        form.scope === "group"
                                            ? "selectedScopeButton"
                                            : ""
                                    }
                                    type="button"
                                    onClick={() => changeScope("group")}
                                >
                                    グループで計算
                                </button>
                            </div>
                        </section>

                        <section className="forecastSection">
                            <label className="forecastMonthLabel">
                                開始月
                                <input
                                    type="month"
                                    value={form.start_month}
                                    onChange={(e) =>
                                        changeStartMonth(e.target.value)
                                    }
                                />
                            </label>
                        </section>

                        <section className="forecastSection">
                            <h2>現在残高</h2>
                            <label className="balanceField">
                                {form.scope === "group"
                                    ? "グループで使える金額"
                                    : "自分が使える金額"}
                                <div className="forecastAmountField">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={form.current_balance}
                                        onChange={(e) =>
                                            changeCurrentBalance(
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <span>円</span>
                                </div>
                            </label>
                        </section>

                        {renderExpenseRows("fixed_incomes")}
                        {renderExpenseRows("variable_incomes")}
                        {renderExpenseRows("fixed_expenses")}
                        {renderExpenseRows("variable_expenses")}

                        <section className="forecastSection">
                            <h2>計算結果</h2>
                            <div className="resultGrid">
                                {monthTotals.map((total) => (
                                    <div
                                        className="resultCard"
                                        key={total.month}
                                    >
                                        <strong>
                                            {formatMonth(total.month)}
                                        </strong>
                                        <span>
                                            月初残高：
                                            {formatAmount(total.startBalance)}
                                        </span>
                                        <span>
                                            固定収入：
                                            {formatAmount(
                                                total.fixedIncomeTotal,
                                            )}
                                        </span>
                                        <span>
                                            変動収入：
                                            {formatAmount(
                                                total.variableIncomeTotal,
                                            )}
                                        </span>
                                        <span>
                                            収入合計：
                                            {formatAmount(total.incomeTotal)}
                                        </span>
                                        <span>
                                            固定支出：
                                            {formatAmount(total.fixedTotal)}
                                        </span>
                                        <span>
                                            変動支出：
                                            {formatAmount(total.variableTotal)}
                                        </span>
                                        <span>
                                            支出合計：
                                            {formatAmount(total.expenseTotal)}
                                        </span>
                                        <b
                                            className={
                                                total.remaining < 0
                                                    ? "minusResult"
                                                    : ""
                                            }
                                        >
                                            月末予想残高：
                                            {formatAmount(total.remaining)}
                                        </b>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="forecastSaveArea">
                            <button
                                className="forecastSaveButton"
                                type="submit"
                            >
                                保存
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </>
    );
};

export default CashFlowForecast;
