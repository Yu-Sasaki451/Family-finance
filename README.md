# Family Finance

夫婦・家族の支出を記録し、カテゴリごとに設定した負担割合から月ごとの精算額を計算する家計簿アプリです。

支出の一部を「個人分」として登録できるため、共有する支出と個人が負担する支出を分けて精算できます。また、各カテゴリの支出に関係する収入を登録し、支出から差し引いて計算できます。

## 主な機能

- 支出の登録・編集・削除
- 支払った人、カテゴリ、支払日、金額、メモの記録
- 支出に含まれる個人分の金額とメモの記録
- カテゴリの登録・編集・削除
- カテゴリごとの負担割合設定
- 月ごとの支出・収入・差引額の集計
- 支払額と負担額をもとにした2人間の精算額計算
- 各カテゴリに対する収入の登録
- スマートフォン表示への対応
- 有効期限付きリンクによるパスワード再設定

## 精算の仕組み

1. 支出総額から収入を引き、差引額を計算します。
2. 差引額から各ユーザーの個人分を引き、共有額を計算します。
3. 共有額をカテゴリごとの負担割合で分け、個人分を加えて各ユーザーの負担額を計算します。
4. 実際に支払った金額と負担額の差から、誰が誰へいくら支払うかを表示します。

現在の精算機能は、ユーザーが2人の場合に対応しています。

## 使用技術

| 分類 | 技術 |
| --- | --- |
| バックエンド | Cloudflare Workers |
| フロントエンド | React 19 / React Router / Axios |
| ビルドツール | Vite 5 |
| データベース | Cloudflare D1 |
| デプロイ | Wrangler |

## 画面構成

| URL | 内容 |
| --- | --- |
| `/` | 月別集計、支出明細、精算結果の表示 |
| `/expense` | 支出と個人分の登録 |
| `/category` | カテゴリの登録・編集・削除 |
| `/ratio` | カテゴリごとの負担割合設定 |

## ER図

GitHub 上で確認できる Mermaid 形式の ER 図を用意しています。

- [ER図とテーブル定義](docs/er-diagram.md)

## 環境構築

### 必要なもの

- Node.js 22 以上
- Cloudflare アカウント
- Wrangler

### セットアップ

```bash
git clone git@github.com:Yu-Sasaki451/Family-finance.git
cd family-finance
npm install
npm run build
npm run d1:migrate:local
npm run worker:dev
```

セットアップ後、以下の URL へアクセスします。

- アプリ: [http://localhost:8787](http://localhost:8787)

### Cloudflare へのデプロイ

最初に D1 データベースを作成します。

```bash
npx wrangler d1 create family-finance
```

表示された `database_id` を `wrangler.jsonc` の `database_id` に入れてください。

その後、remote の D1 に migration を適用してからデプロイします。

```bash
npm run d1:migrate:remote
npm run deploy
```

### パスワードの再設定

ログイン画面の「パスワードをお忘れの方」から再設定を案内します。
リンクは30分間・1回のみ有効です。データベースにはリンクのトークン自体を保存せず、SHA-256ハッシュを保存します。
再設定が完了すると、そのユーザーの既存セッションと他の再設定リンクをすべて無効にします。

メール配信にはResendの送信用APIキーと認証済みの送信元が必要です。
`wrangler.jsonc` の `vars.APP_URL` を本番URLに合わせ、以下のシークレットを設定します。

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put PASSWORD_RESET_FROM
```

送信元の例は `Family Finance <noreply@example.com>` です。
未設定の場合、画面に管理者への問い合わせを案内し、送信できたという表示は行いません。
ローカルの配信テストには `.dev.vars.example` を `.dev.vars` にコピーして設定します。

管理者はCloudflareにログインできる端末から、メール配信なしでもリンクを発行できます。

```bash
npm run password:reset-link -- --email user@example.com --remote
```

表示されるリンクはアカウント所有者にのみ渡してください。発行だけではパスワードや既存セッションは変更されません。
新しいパスワードは、所有者がリンクを開いて設定します。
ローカル環境での確認には `--remote` の代わりに `--local` を指定します。

Workerの認証テストは `npm run test:worker` で実行します（Node.js 22.13以上）。

### 初期データ

D1 migration で以下のカテゴリが自動登録されます。

- 食費
- 電気代
- 水道代
- 日用品
- 交通費
- 通信費
- 家ローン
- その他

ユーザーは画面の新規登録から作成します。最初のユーザー登録時にグループが作られ、カテゴリごとの初期割合も自動作成されます。

## API

| メソッド | エンドポイント | 内容 |
| --- | --- | --- |
| `GET` | `/api/categories` | カテゴリ一覧を取得 |
| `POST` | `/api/categories` | カテゴリを登録 |
| `PUT/PATCH` | `/api/categories/{category}` | カテゴリを更新 |
| `DELETE` | `/api/categories/{category}` | カテゴリを削除 |
| `GET` | `/api/ratios` | 負担割合の一覧を取得 |
| `PUT` | `/api/ratios/{category}` | カテゴリの負担割合を更新 |
| `GET` | `/api/expenses/options` | 支出登録用の選択肢を取得 |
| `GET` | `/api/expenses/monthly` | 月別集計・明細・精算結果を取得 |
| `POST` | `/api/expenses` | 支出を登録 |
| `PUT` | `/api/expenses/{expense}` | 支出を更新 |
| `DELETE` | `/api/expenses/{expense}` | 支出を削除 |

## ディレクトリ構成

```text
app/
└── ...                 # 旧Laravel実装。Worker移行時の参照用

d1/
└── migrations/         # D1用テーブル定義と初期カテゴリ

resources/
├── css/                # 画面のスタイル
└── js/                 # Reactコンポーネントと画面

worker/
└── index.js            # Cloudflare Workers API
```

## 注意事項

- 本番デプロイ前に、`wrangler.jsonc` の `database_id` を実際の D1 database id に変更してください。
- Render/PostgreSQL の既存データを D1 へ移す処理は、別途エクスポート/インポートが必要です。
- 負担割合は、カテゴリごとに全ユーザーの合計が100%になるように設定する必要があります。
- 収入は、どのカテゴリの支出にも登録できます。
- 個人分の合計は、支出総額を超えて登録できません。
