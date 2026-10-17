import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const remote = args.includes("--remote");
const local = args.includes("--local");
const emailIndex = args.indexOf("--email");
const urlIndex = args.indexOf("--url");
const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : "";
const config = JSON.parse(readFileSync(join(root, "wrangler.jsonc"), "utf8"));
const origin = new URL(urlIndex >= 0 ? args[urlIndex + 1] : remote ? config.vars.APP_URL : "http://localhost:8787");

if (local === remote || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
    console.error("Usage: npm run password:reset-link -- --email user@example.com --remote|--local [--url https://app.example.com]");
    process.exit(1);
}
if (origin.username || origin.password || (remote && origin.protocol !== "https:")) {
    throw new Error("本番の再設定リンクにはHTTPSのURLを指定してください。");
}

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
const now = Date.now();
const expiresAt = now + 30 * 60 * 1000;
const directory = mkdtempSync(join(tmpdir(), "family-finance-reset-"));
try {
    const sqlPath = join(directory, "issue.sql");
    // 生のトークンはSQLやWranglerのログへ渡さず、ハッシュだけを保存する。
    writeFileSync(sqlPath,
        `INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at)
         SELECT '${tokenHash}', id, ${now}, ${expiresAt} FROM users WHERE lower(email) = '${email.replaceAll("'", "''")}'
         RETURNING user_id;`, { mode: 0o600 });
    const output = execFileSync(join(root, "node_modules/.bin/wrangler"), [
        "d1", "execute", "family-finance", remote ? "--remote" : "--local", "--file", sqlPath, "--json",
    ], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, WRANGLER_LOG_PATH: join(directory, "wrangler.log") },
    });
    const result = JSON.parse(output);
    if (!result.some((statement) => statement.results?.some((row) => row.user_id))) {
        throw new Error("指定されたメールアドレスは登録されていません。");
    }
    console.log(`${origin.origin}/reset-password#token=${token}`);
    console.log(`有効期限: ${new Date(expiresAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（日本時間）。1回のみ使用可能です。`);
} catch (error) {
    // Wranglerの出力には内部情報が含まれるため、そのまま表示しない。
    console.error(error.status ? "リンクを発行できませんでした。Cloudflareの認証とマイグレーションを確認してください。" : error.message);
    process.exitCode = 1;
} finally {
    rmSync(directory, { recursive: true, force: true });
}
