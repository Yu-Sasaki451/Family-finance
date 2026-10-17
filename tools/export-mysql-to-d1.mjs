import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const outputPath = process.argv[2] ?? "/private/tmp/family-finance-d1-import.sql";

const tables = [
    {
        name: "users",
        columns: ["id", "name", "email", "password", "remember_token", "created_at", "updated_at"],
        select: [
            "id",
            "name",
            "email",
            "password",
            "remember_token",
            "created_at",
            "updated_at",
        ],
    },
    {
        name: "families",
        columns: ["id", "name", "created_at", "updated_at"],
        select: ["id", "name", "created_at", "updated_at"],
    },
    {
        name: "family_user",
        columns: ["id", "family_id", "user_id", "role", "created_at", "updated_at"],
        select: ["id", "family_id", "user_id", "role", "created_at", "updated_at"],
    },
    {
        name: "categories",
        columns: ["id", "name", "created_at", "updated_at"],
        select: ["id", "name", "created_at", "updated_at"],
    },
    {
        name: "ratios",
        columns: ["id", "family_id", "user_id", "category_id", "ratio", "created_at", "updated_at"],
        select: ["id", "family_id", "user_id", "category_id", "ratio", "created_at", "updated_at"],
    },
    {
        name: "expenses",
        columns: ["id", "family_id", "user_id", "category_id", "amount", "income", "spent_at", "note", "created_at", "updated_at"],
        select: ["id", "family_id", "user_id", "category_id", "amount", "income", "spent_at", "note", "created_at", "updated_at"],
    },
    {
        name: "personal_expenses",
        columns: ["id", "expense_id", "user_id", "amount", "note", "created_at", "updated_at"],
        select: ["id", "expense_id", "user_id", "amount", "note", "created_at", "updated_at"],
    },
    {
        name: "family_invitations",
        columns: ["id", "family_id", "invited_by_user_id", "email", "token", "expires_at", "accepted_at", "created_at", "updated_at"],
        select: ["id", "family_id", "invited_by_user_id", "email", "token", "expires_at", "accepted_at", "created_at", "updated_at"],
    },
    {
        name: "cash_flow_forecasts",
        columns: [
            "id",
            "family_id",
            "scope",
            "owner_id",
            "forecast_months",
            "start_month",
            "current_balance",
            "fixed_incomes",
            "variable_incomes",
            "fixed_expenses",
            "variable_expenses",
            "simulation_incomes",
            "simulation_fixed_expenses",
            "simulation_variable_expenses",
            "created_at",
            "updated_at",
        ],
        select: [
            "id",
            "family_id",
            "scope",
            "owner_id",
            "3",
            "start_month",
            "current_balance",
            "CAST(fixed_incomes AS CHAR)",
            "CAST(variable_incomes AS CHAR)",
            "CAST(fixed_expenses AS CHAR)",
            "CAST(variable_expenses AS CHAR)",
            "CAST(simulation_incomes AS CHAR)",
            "CAST(simulation_fixed_expenses AS CHAR)",
            "CAST(simulation_variable_expenses AS CHAR)",
            "created_at",
            "updated_at",
        ],
    },
];

const deleteOrder = [
    "personal_access_tokens",
    "cash_flow_forecasts",
    "family_invitations",
    "personal_expenses",
    "expenses",
    "ratios",
    "family_user",
    "users",
    "families",
    "categories",
];

const statements = [
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
    ...deleteOrder.map((table) => `DELETE FROM ${table};`),
];

for (const table of tables) {
    const rows = queryRows(table);

    for (const row of rows) {
        statements.push(insertStatement(table.name, table.columns, row));
    }
}

statements.push("COMMIT;");
writeFileSync(outputPath, `${statements.join("\n")}\n`);
console.log(outputPath);

function queryRows(table) {
    const objectArguments = table.columns
        .map((column, index) => `'${column}', ${table.select[index]}`)
        .join(", ");
    const sql = `SELECT JSON_OBJECT(${objectArguments}) FROM ${table.name} ORDER BY id;`;
    const output = execFileSync(
        "docker",
        [
            "compose",
            "exec",
            "-T",
            "mysql",
            "sh",
            "-lc",
            'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" --batch --raw --skip-column-names',
        ],
        {
            cwd: process.cwd(),
            input: sql,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
        },
    );

    return output
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

function insertStatement(table, columns, row) {
    const columnSql = columns.join(", ");
    const valueSql = columns.map((column) => sqlValue(row[column], column)).join(", ");

    return `INSERT INTO ${table} (${columnSql}) VALUES (${valueSql});`;
}

function sqlValue(value, column) {
    if (value === null || value === undefined) {
        if (column === "created_at" || column === "updated_at") {
            return `'${new Date().toISOString()}'`;
        }

        return "NULL";
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "NULL";
    }

    return `'${String(value).replaceAll("'", "''")}'`;
}
