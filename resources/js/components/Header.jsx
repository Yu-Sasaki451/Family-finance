import { Link } from "react-router-dom";
import "../../css/components/Header.css";
import { ROUTES } from "../routes/routes";
import { useAuth } from "../auth/AuthContext";

const Header = () => {
    const { user, logout } = useAuth();

    return (
        <header className="header">
            <div className="headerFlex">
                <div className="headerTop">
                    <div className="headerLeft">
                        <Link
                            className="headerLink linkIndex"
                            to={ROUTES.INDEX}
                        >
                            家計簿
                        </Link>
                    </div>
                    <div className="headerRight">
                        <div className="headerAccount">
                            <span className="headerUserName">{user?.name}</span>
                            <button
                                className="headerLogoutButton"
                                type="button"
                                onClick={logout}
                            >
                                ログアウト
                            </button>
                        </div>
                    </div>
                </div>
                <nav className="headerPageLinks">
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
                        to={ROUTES.CASH_FLOW_FORECAST}
                    >
                        予測
                    </Link>
                    <Link
                        className="headerLink navRightLink"
                        to={ROUTES.SETTING}
                    >
                        設定
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
