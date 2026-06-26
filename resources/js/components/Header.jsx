import { Link } from "react-router-dom";
import "../../css/components/Header.css";
import { ROUTES } from "../routes/routes";

const Header = () => {
    return (
        <header className="header">
            <div className="headerFlex">
                <div className="headerLeft">
                    <nav className="headerNavLeft">
                        <Link
                            className="headerLink linkIndex"
                            to={ROUTES.INDEX}
                        >
                            家計簿
                        </Link>
                    </nav>
                </div>
                <div className="headerRight">
                    <nav className="headerNavRight">
                        <Link
                            className="headerLink navRightLink"
                            to={ROUTES.EXPENSE}
                        >
                            支出登録
                        </Link>
                        <Link
                            className="headerLink navRightLink"
                            to={ROUTES.SUMMARY}
                        >
                            集計
                        </Link>
                        <Link
                            className="headerLink navRightLink"
                            to={ROUTES.SETTING}
                        >
                            設定
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;
