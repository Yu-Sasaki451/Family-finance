CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    remember_token TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    ratio REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (family_id, user_id, category_id)
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    income INTEGER,
    spent_at TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    invited_by_user_id INTEGER NOT NULL,
    email TEXT,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT,
    accepted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tokenable_type TEXT NOT NULL,
    tokenable_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    abilities TEXT,
    last_used_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    scope TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    forecast_months INTEGER NOT NULL DEFAULT 3,
    start_month TEXT NOT NULL,
    current_balance INTEGER NOT NULL,
    fixed_incomes TEXT NOT NULL,
    variable_incomes TEXT NOT NULL,
    fixed_expenses TEXT NOT NULL,
    variable_expenses TEXT NOT NULL,
    simulation_incomes TEXT,
    simulation_fixed_expenses TEXT,
    simulation_variable_expenses TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (family_id, scope, owner_id, forecast_months)
);

CREATE INDEX IF NOT EXISTS family_user_family_id_index ON family_user (family_id);
CREATE INDEX IF NOT EXISTS family_user_user_id_index ON family_user (user_id);
CREATE INDEX IF NOT EXISTS ratios_family_category_index ON ratios (family_id, category_id);
CREATE INDEX IF NOT EXISTS expenses_family_spent_at_index ON expenses (family_id, spent_at);
CREATE INDEX IF NOT EXISTS personal_expenses_expense_id_index ON personal_expenses (expense_id);
CREATE INDEX IF NOT EXISTS personal_access_tokens_token_index ON personal_access_tokens (token);

INSERT OR IGNORE INTO categories (name, created_at, updated_at) VALUES
    ('食費', datetime('now'), datetime('now')),
    ('電気代', datetime('now'), datetime('now')),
    ('水道代', datetime('now'), datetime('now')),
    ('日用品', datetime('now'), datetime('now')),
    ('交通費', datetime('now'), datetime('now')),
    ('通信費', datetime('now'), datetime('now')),
    ('家ローン', datetime('now'), datetime('now')),
    ('その他', datetime('now'), datetime('now'));
