# Family Finance

夫婦・家族の支出を記録し、カテゴリごとに設定した負担割合から月ごとの精算額を計算する家計簿アプリです。

支出の一部を「個人分」として登録できるため、共有する支出と個人が負担する支出を分けて精算できます。また、電気代では売電収入を登録し、支出から差し引いて計算できます。

## 主な機能

- 支出の登録・編集・削除
- 支払った人、カテゴリ、支払日、金額、メモの記録
- 支出に含まれる個人分の金額とメモの記録
- カテゴリの登録・編集・削除
- カテゴリごとの負担割合設定
- 月ごとの支出・収入・差引額の集計
- 支払額と負担額をもとにした2人間の精算額計算
- 電気代に対する売電収入の登録
- スマートフォン表示への対応

## 精算の仕組み

1. 支出総額から売電収入を引き、差引額を計算します。
2. 差引額から各ユーザーの個人分を引き、共有額を計算します。
3. 共有額をカテゴリごとの負担割合で分け、個人分を加えて各ユーザーの負担額を計算します。
4. 実際に支払った金額と負担額の差から、誰が誰へいくら支払うかを表示します。

現在の精算機能は、ユーザーが2人の場合に対応しています。

## 使用技術

| 分類 | 技術 |
| --- | --- |
| バックエンド | PHP 8.1以上 / Laravel 10 |
| フロントエンド | React 19 / React Router / Axios |
| ビルドツール | Vite 5 |
| データベース | MySQL 8.4 |
| 開発環境 | Docker / Laravel Sail |
| テスト | PHPUnit |

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

- Docker Desktop
- Composer

### セットアップ

```bash
git clone git@github.com:Yu-Sasaki451/Family-finance.git
cd family-finance
cp .env.example .env
composer install
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail npm install
./vendor/bin/sail artisan migrate
./vendor/bin/sail artisan db:seed --class=UserSeeder
./vendor/bin/sail artisan db:seed --class=CategorySeeder
./vendor/bin/sail artisan db:seed --class=RatioSeeder
./vendor/bin/sail npm run dev
```

セットアップ後、以下の URL へアクセスします。

- アプリ: [http://localhost](http://localhost)
- phpMyAdmin: [http://localhost:8080](http://localhost:8080)

フロントエンドの開発サーバーを停止して利用する場合は、事前に以下を実行してください。

```bash
./vendor/bin/sail npm run build
```

### 初期データ

Seeder を実行すると、以下のデータが登録されます。

- ユーザー: `夫`、`妻`
- カテゴリ: 食費、電気代、水道代、日用品、交通費、通信費、家ローン、その他
- 負担割合: 家ローンのみ `夫 45% / 妻 55%`、その他は `夫 50% / 妻 50%`

> `DatabaseSeeder` は現在、未作成の `ExpenseSeeder` を参照しています。そのため、上記手順では利用可能な Seeder を個別に実行しています。

## テスト

```bash
./vendor/bin/sail artisan test
```

主に以下の API 動作をテストしています。

- カテゴリの登録・編集・削除
- 支出と個人分の登録・編集・削除
- 売電収入の入力制限と差引計算
- 月別集計と精算計算
- カテゴリごとの負担割合設定

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
├── Http/
│   ├── Controllers/    # APIの処理
│   └── Requests/       # 入力値のバリデーション
└── Models/             # Eloquentモデル

database/
├── migrations/         # テーブル定義
└── seeders/            # 初期データ

resources/
├── css/                # 画面のスタイル
├── js/                 # Reactコンポーネントと画面
└── views/              # Reactを読み込むBlade

routes/
├── api.php             # APIルート
└── web.php             # 画面表示ルート
```

## 注意事項

- 現在はログイン機能を使用せず、Seeder で登録した2人のユーザーを対象にしています。
- 負担割合は、カテゴリごとに全ユーザーの合計が100%になるように設定する必要があります。
- 売電収入は、カテゴリ名が「電気代」の支出にのみ登録できます。
- 個人分の合計は、支出総額を超えて登録できません。
