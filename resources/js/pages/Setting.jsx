import { Link } from "react-router-dom";
import "../../css/pages/Setting.css";
import Header from "../components/Header";
import { ROUTES } from "../routes/routes";

const Setting = () => {
    return (
        <>
            <Header />
            <main className="settingContainer">
                <h1 className="settingTitle">設定</h1>

                <div className="settingMenu">
                    <Link className="settingMenuLink" to={ROUTES.CATEGORY}>
                        カテゴリ
                    </Link>
                    <Link className="settingMenuLink" to={ROUTES.RATIO}>
                        割合設定
                    </Link>
                    <Link className="settingMenuLink" to={ROUTES.FAMILY}>
                        グループ
                    </Link>
                </div>
            </main>
        </>
    );
};

export default Setting;
