import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import worker from "../../worker/index.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");

function setup(t, mail = false) {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("../../d1/migrations/0001_initial.sql", import.meta.url), "utf8"));
    db.exec(readFileSync(new URL("../../d1/migrations/0002_password_reset.sql", import.meta.url), "utf8"));
    db.exec(`INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES
        (1, 'Test', 'owner@example.com', 'old-hash', 'before', 'before'),
        (2, 'Other', 'other@example.com', 'other-hash', 'before', 'before');
        INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, created_at, updated_at)
        VALUES ('user', 1, 'web', '${digest("existing-session")}', 'before', 'before'),
               ('user', 2, 'web', '${digest("other-session")}', 'before', 'before');`);
    let batchFailure = false;
    const prepare = (sql) => {
        let params = [];
        return {
            bind(...values) { params = values; return this; },
            async first() { return db.prepare(sql).get(...params) || null; },
            async all() { return { results: db.prepare(sql).all(...params) }; },
            async run() {
                const result = db.prepare(sql).run(...params);
                return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
            },
        };
    };
    const env = {
        DB: {
            prepare,
            async batch(statements) {
                db.exec("BEGIN");
                try {
                    const results = [];
                    for (const statement of statements) {
                        results.push(await statement.run());
                        if (batchFailure) throw new Error("Injected database failure");
                    }
                    db.exec("COMMIT");
                    return results;
                } catch (error) { db.exec("ROLLBACK"); throw error; }
            },
        },
        ...(mail ? { APP_URL: "https://finance.example.com", RESEND_API_KEY: "test-key", PASSWORD_RESET_FROM: "Finance <noreply@example.com>" } : {}),
    };
    const mails = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, "https://api.resend.com/emails");
        mails.push({ ...JSON.parse(options.body), headers: options.headers });
        return Response.json({ id: "test-email" });
    });
    t.after(() => db.close());
    const background = [];
    const ctx = { waitUntil(promise) { background.push(promise); } };
    const call = (path, body, headers = {}) => worker.fetch(new Request(`https://untrusted-host.example${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1", ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env, ctx);
    const issue = (userId = 1, expiresAt = Date.now() + 1800000) => {
        const token = randomBytes(32).toString("base64url");
        db.prepare("INSERT INTO password_reset_tokens VALUES (?, ?, ?, ?)").run(digest(token), userId, Date.now(), expiresAt);
        return token;
    };
    const reset = (token, password = "new-password", extra = {}) => call("/api/auth/reset-password", {
        token, password, password_confirmation: password, ...extra,
    });
    return { db, env, mails, call, issue, reset, flush: () => Promise.all(background), failBatch: () => { batchFailure = true; } };
}

test("reset replaces password, revokes every session/link for the owner, and leaves other users intact", async (t) => {
    const s = setup(t);
    const token = s.issue();
    const otherLink = s.issue(2);
    s.issue();
    const result = await s.reset(token, "  new-password-日本語  ");
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    assert.match(s.db.prepare("SELECT password FROM users WHERE id=1").get().password, /^pbkdf2\$100000\$/);
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM personal_access_tokens WHERE tokenable_id=1").get().n, 0);
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM password_reset_tokens WHERE user_id=1").get().n, 0);
    assert.equal(s.db.prepare("SELECT password FROM users WHERE id=2").get().password, "other-hash");
    assert.ok(s.db.prepare("SELECT 1 FROM password_reset_tokens WHERE token_hash=?").get(digest(otherLink)));
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM personal_access_tokens WHERE tokenable_id=2").get().n, 1);
    assert.equal((await s.reset(token)).status, 422);
    assert.equal((await s.call("/api/auth/me", undefined, { Authorization: "Bearer existing-session" })).status, 401);
    assert.equal((await s.call("/api/auth/login", { email: "owner@example.com", password: "old-password" })).status, 422);
    const login = await s.call("/api/auth/login", { email: "owner@example.com", password: "  new-password-日本語  " });
    assert.equal(login.status, 200);
    const { token: accessToken } = await login.json();
    assert.equal((await s.call("/api/auth/me", undefined, { Authorization: `Bearer ${accessToken}` })).status, 200);
});

test("expired, unknown and invalid tokens cannot change passwords or revoke sessions", async (t) => {
    const s = setup(t);
    for (const token of [s.issue(1, Date.now() - 1), randomBytes(32).toString("base64url"), "invalid"]) {
        assert.equal((await s.reset(token)).status, 422);
    }
    assert.equal(s.db.prepare("SELECT password FROM users WHERE id=1").get().password, "old-hash");
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM personal_access_tokens").get().n, 2);
});

test("password validation does not consume the link", async (t) => {
    const s = setup(t);
    const token = s.issue();
    for (const password of ["short", "a".repeat(129)]) assert.equal((await s.reset(token, password)).status, 422);
    assert.equal((await s.reset(token, "new-password", { password_confirmation: "mismatch" })).status, 422);
    assert.equal((await s.reset(token)).status, 200);
});

test("concurrent submissions can consume a reset link only once", async (t) => {
    const s = setup(t);
    const token = s.issue();
    const results = await Promise.all([s.reset(token, "password-one"), s.reset(token, "password-two")]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 422]);
});

test("failed transaction keeps the old password, sessions and reset link", async (t) => {
    const s = setup(t);
    t.mock.method(console, "error", () => {});
    const token = s.issue();
    s.failBatch();
    assert.equal((await s.reset(token)).status, 500);
    assert.equal(s.db.prepare("SELECT password FROM users WHERE id=1").get().password, "old-hash");
    assert.ok(s.db.prepare("SELECT 1 FROM password_reset_tokens WHERE token_hash=?").get(digest(token)));
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM personal_access_tokens").get().n, 2);
});

test("missing email setup is explicitly unavailable and creates no token", async (t) => {
    const s = setup(t);
    assert.deepEqual(await (await s.call("/api/auth/password-reset")).json(), { email_available: false });
    assert.equal((await s.call("/api/auth/forgot-password", { email: "owner@example.com" })).status, 503);
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM password_reset_tokens").get().n, 0);
});

test("email flow uses a fixed origin, hashes tokens and hides account existence", async (t) => {
    const s = setup(t, true);
    const known = await s.call("/api/auth/forgot-password", { email: " OWNER@example.com " });
    const unknown = await s.call("/api/auth/forgot-password", { email: "unknown@example.com" });
    assert.equal(known.status, 200);
    assert.deepEqual(await known.json(), await unknown.json());
    await s.flush();
    assert.equal(s.mails.length, 1);
    const link = s.mails[0].text.match(/https:\/\/[^\s]+/)[0];
    const url = new URL(link);
    assert.equal(url.origin, "https://finance.example.com");
    assert.equal(url.search, "");
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(s.db.prepare("SELECT token_hash FROM password_reset_tokens").get().token_hash, digest(token));
    assert.equal(s.mails[0].headers["Idempotency-Key"], `password-reset/${digest(token)}`);
    assert.equal((await s.reset(token)).status, 200);
});

test("mail failure removes undelivered token without revealing account existence", async (t) => {
    const s = setup(t, true);
    t.mock.method(globalThis, "fetch", async () => Response.json({ error: "provider error" }, { status: 500 }));
    t.mock.method(console, "error", () => {});
    const response = await s.call("/api/auth/forgot-password", { email: "owner@example.com" });
    assert.equal(response.status, 200);
    await s.flush();
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM password_reset_tokens").get().n, 0);
    assert.equal(s.db.prepare("SELECT password FROM users WHERE id=1").get().password, "old-hash");
});

test("email requests are limited per email and IP", async (t) => {
    const s = setup(t, true);
    for (let i = 0; i < 4; i++) {
        assert.equal((await s.call("/api/auth/forgot-password", { email: "owner@example.com" })).status, 200);
        await s.flush();
    }
    assert.equal(s.mails.length, 3);
    for (let i = 4; i < 10; i++) assert.equal((await s.call("/api/auth/forgot-password", { email: `unknown${i}@example.com` })).status, 200);
    assert.equal((await s.call("/api/auth/forgot-password", { email: "owner@example.com" })).status, 429);
    await s.flush();
});

test("invalid reset attempts are rate limited and malformed JSON gets 400", async (t) => {
    const s = setup(t);
    for (let i = 0; i < 20; i++) assert.equal((await s.reset("bad")).status, 422);
    assert.equal((await s.reset("bad")).status, 429);
    assert.equal((await s.call("/api/auth/forgot-password", null)).status, 400);
    assert.equal((await s.call("/api/auth/forgot-password", [])).status, 400);
});
