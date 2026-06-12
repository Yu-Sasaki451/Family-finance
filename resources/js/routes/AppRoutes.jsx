import Index from "../pages/Index";
import Category from "../pages/Category";
import Ratio from "../pages/Ratio";
import Expense from "../pages/Expense";
import { Routes, Route } from "react-router-dom";
import { ROUTES } from "./routes";


const AppRoutes = () => {
    return (
        <Routes>
            <Route path={ROUTES.INDEX} element={<Index />}></Route>
            <Route path={ROUTES.CATEGORY} element={<Category />}></Route>
            <Route path={ROUTES.RATIO} element={<Ratio />}></Route>
            <Route path={ROUTES.EXPENSE} element={<Expense />}></Route>
        </Routes>
    );
};

export default AppRoutes;