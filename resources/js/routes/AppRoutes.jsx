import Index from "../pages/Index";
import Category from "../pages/Category";
import Ratio from "../pages/Ratio";
import Expense from "../pages/Expense";
import Setting from "../pages/Setting";
import Summary from "../pages/Summary";
import CashFlowForecast from "../pages/CashFlowForecast";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Family from "../pages/Family";
import Manual from "../pages/Manual";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { ROUTES } from "./routes";
import { useAuth } from "../auth/AuthContext";

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // ログイン確認中に一瞬ログイン画面へ飛ばないよう、確認が終わるまで待つ。
        return <main className="loadingScreen">読み込み中...</main>;
    }

    if (!isAuthenticated) {
        // 未ログインならログイン画面へ戻し、ログイン後に元のページへ戻れるよう場所を渡す。
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />}></Route>
            <Route path={ROUTES.REGISTER} element={<Register />}></Route>
            <Route path={ROUTES.INDEX} element={<ProtectedRoute><Index /></ProtectedRoute>}></Route>
            <Route path={ROUTES.CATEGORY} element={<ProtectedRoute><Category /></ProtectedRoute>}></Route>
            <Route path={ROUTES.RATIO} element={<ProtectedRoute><Ratio /></ProtectedRoute>}></Route>
            <Route path={ROUTES.EXPENSE} element={<ProtectedRoute><Expense /></ProtectedRoute>}></Route>
            <Route path={ROUTES.SETTING} element={<ProtectedRoute><Setting /></ProtectedRoute>}></Route>
            <Route path={ROUTES.MANUAL} element={<ProtectedRoute><Manual /></ProtectedRoute>}></Route>
            <Route path={ROUTES.SUMMARY} element={<ProtectedRoute><Summary /></ProtectedRoute>}></Route>
            <Route path={ROUTES.CASH_FLOW_FORECAST} element={<ProtectedRoute><CashFlowForecast /></ProtectedRoute>}></Route>
            <Route path={ROUTES.FAMILY} element={<ProtectedRoute><Family /></ProtectedRoute>}></Route>
        </Routes>
    );
};

export default AppRoutes;
