import React from "react";
import ReactDOM from "react-dom/client";
import "../css/app.css";
import AppRoutes from "./routes/AppRoutes";
import { BrowserRouter } from "react-router-dom";

function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
