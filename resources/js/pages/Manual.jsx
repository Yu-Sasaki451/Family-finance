import { Link } from "react-router-dom";
import "../../css/pages/Manual.css";
import Header from "../components/Header";
import { ROUTES } from "../routes/routes";

const manualSections = [
    {
        id: "start",
        title: "はじめに",
        image: "/manual/manual-start.svg",
        imageAlt: "画面上のメニューから使いたい機能を選ぶ説明図",
        lead: "画面の上にあるメニューから、やりたいことを選びます。",
        steps: [
            "お金を使ったら「支出登録」を押します。",
            "今月の合計を見たいときは「集計」を押します。",
            "今後のお金を計算したいときは「収支計算」を押します。",
            "カテゴリ・割合・グループ・このマニュアルは「設定」から開きます。",
        ],
    },
    {
        id: "expense",
        title: "支出を登録する",
        image: "/manual/manual-expense.svg",
        imageAlt: "支出登録画面で支払日、支払った人、カテゴリ、金額を入力する説明図",
        lead: "買い物や支払いをしたら、まずここに入力します。",
        steps: [
            "「支払日」を選びます。",
            "「支払った人」と「カテゴリ」を選びます。",
            "「合計金額」に支払った金額を入れます。",
            "個人だけで使った分があれば「個人分」に金額を入れます。",
            "最後に「登録」を押します。登録後は、その月の集計画面に移動します。",
        ],
    },
    {
        id: "summary",
        title: "集計を見る",
        image: "/manual/manual-summary.svg",
        imageAlt: "集計画面で月を選んで合計と精算を確認する説明図",
        lead: "月ごとの合計、カテゴリごとの金額、精算の目安を確認できます。",
        steps: [
            "見たい月を選びます。",
            "カテゴリごとの合計金額を確認します。",
            "登録内容を直したいときは、明細から変更できます。",
            "削除すると元に戻せないので、確認画面の内容をよく読んでから押します。",
        ],
    },
    {
        id: "forecast",
        title: "収支計算を使う",
        image: "/manual/manual-forecast.svg",
        imageAlt: "収支計算画面で1ヶ月シミュレーションと3ヶ月、6ヶ月予測を選ぶ説明図",
        lead: "これから手元にいくら残るかを計算できます。",
        steps: [
            "すぐに確認したいときは「1ヶ月シミュレーション」を使います。",
            "先の予定まで見たいときは「3ヶ月予測」または「6ヶ月予測」を使います。",
            "収入、固定費、変動費を入力します。",
            "結果を確認して、残したい内容は「保存」を押します。",
        ],
    },
    {
        id: "setting",
        title: "設定を変える",
        image: "/manual/manual-setting.svg",
        imageAlt: "カテゴリ、割合設定、グループ、使い方マニュアルを設定から開く説明図",
        lead: "家計簿を使いやすくするための準備をします。",
        steps: [
            "「カテゴリ」では、食費や日用品などの名前を追加・変更・削除できます。",
            "「割合設定」では、カテゴリごとに誰が何％負担するかを決めます。合計は100％です。",
            "「グループ」では、グループ名の変更や招待リンクの作成ができます。",
            "操作に迷ったら、設定画面からこのマニュアルを開きます。",
        ],
    },
];

const Manual = () => {
    return (
        <>
            <Header />
            <main className="manualContainer">
                <div className="manualHeader">
                    <div>
                        <p className="manualLabel">困ったときに見るページ</p>
                        <h1 className="manualTitle">使い方マニュアル</h1>
                    </div>
                    <Link className="manualBackLink" to={ROUTES.SETTING}>
                        設定へ戻る
                    </Link>
                </div>

                <nav className="manualQuickLinks" aria-label="マニュアル内の移動">
                    {manualSections.map((section) => (
                        <a key={section.id} href={`#${section.id}`}>
                            {section.title}
                        </a>
                    ))}
                </nav>

                <div className="manualNotice">
                    <strong>基本の流れ</strong>
                    <span>支出登録で入力して、集計で確認します。設定は最初だけ整えると、その後の入力が楽になります。</span>
                </div>

                {manualSections.map((section, index) => (
                    <section className="manualSection" id={section.id} key={section.id}>
                        <div className="manualSectionText">
                            <span className="manualStepNumber">{index + 1}</span>
                            <h2>{section.title}</h2>
                            <p>{section.lead}</p>
                            <ol>
                                {section.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                        </div>
                        <img src={section.image} alt={section.imageAlt} />
                    </section>
                ))}
            </main>
        </>
    );
};

export default Manual;
