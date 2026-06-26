import Header from "../components/Header";
import MonthlyExpenseSummary from "../components/MonthlyExpenseSummary";

const Summary = () => {
    return (
        <>
            <Header />
            <MonthlyExpenseSummary
                title=""
                monthPicker="select"
                showDetailsSection={false}
                showTrendChart
            />
        </>
    );
};

export default Summary;
