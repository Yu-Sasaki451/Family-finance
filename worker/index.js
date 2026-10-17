import bcrypt from "bcryptjs";

const DEFAULT_CATEGORIES = [
    "食費",
    "電気代",
    "水道代",
    "日用品",
    "交通費",
    "通信費",
    "家ローン",
    "その他",
];

const JSON_HEADERS = {
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "no-store",
};

class HttpError extends Error {
    constructor(status, message, errors = null) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);

            if (isLegacyLaravelAsset(url.pathname)) {
                return json({ message: "Not Found" }, 404);
            }

            if (!url.pathname.startsWith("/api/")) {
                return env.ASSETS.fetch(request);
            }

            const response = await handleApi(request, env, url, ctx);

            if (response) {
                return response;
            }

            return json({ message: "Not Found" }, 404);
        } catch (error) {
            if (error instanceof HttpError) {
                return json(
                    {
                        message: error.message,
                        ...(error.errors ? { errors: error.errors } : {}),
                    },
                    error.status,
                );
            }

            console.error(error);

            return json({ message: "Server Error" }, 500);
        }
    },
};

async function handleApi(request, env, url, ctx) {
    const method = request.method.toUpperCase();
    const path = url.pathname.replace(/^\/api/, "") || "/";

    if (method === "OPTIONS") {
        return new Response(null, { status: 204 });
    }

    if (method === "POST" && path === "/auth/register") {
        return register(request, env);
    }

    if (method === "POST" && path === "/auth/login") {
        return login(request, env);
    }

    if (method === "GET" && path === "/auth/password-reset") {
        return json({ email_available: Boolean(passwordResetMailConfig(env)) });
    }

    if (method === "POST" && path === "/auth/forgot-password") {
        return requestPasswordReset(request, env, ctx);
    }

    if (method === "POST" && path === "/auth/reset-password") {
        return resetPassword(request, env);
    }

    const invitationMatch = path.match(/^\/invitations\/([^/]+)$/);

    if (method === "GET" && invitationMatch) {
        return showInvitation(env, invitationMatch[1]);
    }

    const auth = await authenticate(request, env);

    if (method === "GET" && path === "/auth/me") {
        return json(await me(env, auth.user));
    }

    if (method === "POST" && path === "/auth/logout") {
        await env.DB.prepare("DELETE FROM personal_access_tokens WHERE id = ?")
            .bind(auth.token.id)
            .run();

        return new Response(null, { status: 204 });
    }

    if (method === "PUT" && path === "/family") {
        return updateFamily(request, env, auth.user);
    }

    if (method === "POST" && path === "/invitations") {
        return storeInvitation(request, env, auth.user);
    }

    if (method === "GET" && path === "/categories") {
        return json(await all(env, "SELECT id, name, created_at, updated_at FROM categories ORDER BY id"));
    }

    if (method === "POST" && path === "/categories") {
        return storeCategory(request, env, auth.user);
    }

    const categoryMatch = path.match(/^\/categories\/(\d+)$/);

    if (categoryMatch && method === "PUT") {
        return updateCategory(request, env, Number(categoryMatch[1]));
    }

    if (categoryMatch && method === "DELETE") {
        await env.DB.prepare("DELETE FROM categories WHERE id = ?")
            .bind(Number(categoryMatch[1]))
            .run();

        return new Response(null, { status: 204 });
    }

    if (method === "GET" && path === "/ratios") {
        return json(await listRatios(env, auth.user));
    }

    const ratioMatch = path.match(/^\/ratios\/(\d+)$/);

    if (ratioMatch && method === "PUT") {
        await updateRatios(request, env, auth.user, Number(ratioMatch[1]));

        return new Response(null, { status: 204 });
    }

    if (method === "GET" && path === "/expenses/options") {
        return json(await expenseOptions(env, auth.user));
    }

    if (method === "GET" && path === "/expenses/monthly") {
        return json(await monthlyExpenses(env, auth.user, url.searchParams.get("month")));
    }

    if (method === "POST" && path === "/expenses") {
        return storeExpense(request, env, auth.user);
    }

    const expenseMatch = path.match(/^\/expenses\/(\d+)$/);

    if (expenseMatch && method === "PUT") {
        return updateExpense(request, env, auth.user, Number(expenseMatch[1]));
    }

    if (expenseMatch && method === "DELETE") {
        await deleteExpense(env, auth.user, Number(expenseMatch[1]));

        return new Response(null, { status: 204 });
    }

    if (method === "GET" && path === "/cash-flow-forecast") {
        return json(await showCashFlowForecast(env, auth.user, url.searchParams));
    }

    if (method === "PUT" && path === "/cash-flow-forecast") {
        return updateCashFlowForecast(request, env, auth.user);
    }

    if (method === "PUT" && path === "/cash-flow-forecast/simulation") {
        return updateCashFlowSimulation(request, env, auth.user);
    }

    return null;
}

async function register(request, env) {
    const data = await readJson(request);
    const errors = {};
    const name = text(data.name);
    const email = text(data.email).toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";
    const inviteToken = text(data.invite_token);

    if (!name) errors.name = ["名前を入力してください。"];
    if (!email) errors.email = ["メールアドレスを入力してください。"];
    if (email && !email.includes("@")) errors.email = ["メールアドレスの形式で入力してください。"];
    if (!password) errors.password = ["パスワードを入力してください。"];
    if (password && password.length < 8) errors.password = ["パスワードは8文字以上で入力してください。"];

    const existing = email
        ? await first(env, "SELECT id FROM users WHERE lower(email) = lower(?)", [email])
        : null;

    if (existing) {
        errors.email = ["このメールアドレスはすでに登録されています。"];
    }

    throwIfErrors(errors);

    const family = await resolveFamilyForRegistration(env, inviteToken, email);
    const now = timestamp();
    const passwordHash = await hashPassword(password);
    const userResult = await env.DB.prepare(
        "INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
        .bind(name, email, passwordHash, now, now)
        .run();
    const userId = userResult.meta.last_row_id;

    await env.DB.prepare(
        "INSERT OR IGNORE INTO family_user (family_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'member', ?, ?)",
    )
        .bind(family.id, userId, now, now)
        .run();

    await ensureRegistrationDefaults(env, family.id);

    if (inviteToken) {
        await env.DB.prepare("UPDATE family_invitations SET accepted_at = ?, updated_at = ? WHERE token = ?")
            .bind(now, now, inviteToken)
            .run();
    }

    const user = await first(env, "SELECT id, name, email FROM users WHERE id = ?", [userId]);

    return json(await respondWithToken(env, user));
}

async function login(request, env) {
    const data = await readJson(request);
    const email = text(data.email).toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";
    const errors = {};

    if (!email) errors.email = ["メールアドレスを入力してください。"];
    if (email && !email.includes("@")) errors.email = ["メールアドレスの形式で入力してください。"];
    if (!password) errors.password = ["パスワードを入力してください。"];

    throwIfErrors(errors);

    const user = await first(env, "SELECT id, name, email, password FROM users WHERE lower(email) = lower(?)", [email]);

    if (!user || !(await verifyPassword(password, user.password))) {
        throw validationError("email", "メールアドレスまたはパスワードが正しくありません。");
    }

    return json(await respondWithToken(env, {
        id: user.id,
        name: user.name,
        email: user.email,
    }));
}

function passwordResetMailConfig(env) {
    if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM || !env.APP_URL) return null;

    try {
        const origin = new URL(env.APP_URL);
        if (origin.protocol !== "https:" || origin.username || origin.password) return null;
        return { origin: origin.origin };
    } catch {
        return null;
    }
}

async function allowPasswordResetAttempt(env, key, limit) {
    const now = Date.now();
    const window = 15 * 60 * 1000;
    const result = await env.DB.prepare(
        `INSERT INTO password_reset_rate_limits (key, window_started, attempts) VALUES (?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET
           attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END,
           window_started = CASE WHEN window_started <= ? THEN excluded.window_started ELSE window_started END
         RETURNING attempts`,
    ).bind(await sha256Hex(key), now, now - window, now - window).first();

    return result.attempts <= limit;
}

async function requestPasswordReset(request, env, ctx) {
    const data = await readJson(request);
    const email = text(data.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw validationError("email", "メールアドレスの形式で入力してください。");
    }

    const config = passwordResetMailConfig(env);
    if (!config) {
        throw new HttpError(503, "メールでの再設定は現在準備中です。管理者に再設定リンクの発行をご依頼ください。");
    }

    const ip = request.headers.get("CF-Connecting-IP") || "local";
    if (!(await allowPasswordResetAttempt(env, `request-ip:${ip}`, 10))) {
        throw new HttpError(429, "しばらく待ってから、もう一度お試しください。");
    }

    // 登録の有無やメールアドレス単位の送信制限は、同じ応答にして外部へ明かさない。
    const response = () => json({ message: "再設定の依頼を受け付けました。登録されているメールアドレスの場合、再設定リンクをお送りします。届かない場合は、迷惑メールフォルダもご確認のうえ、時間をおいてお試しください。" });
    if (!(await allowPasswordResetAttempt(env, `request-email:${email}`, 3))) return response();

    // 登録の有無によって応答時間にメール配信時間の差が出ないよう、送信は裏で実行する。
    ctx.waitUntil(deliverPasswordReset(env, email, config));
    return response();
}

async function deliverPasswordReset(env, email, config) {
    let tokenHash;
    try {
        const now = Date.now();
        await env.DB.batch([
            env.DB.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?").bind(now),
            env.DB.prepare("DELETE FROM password_reset_rate_limits WHERE window_started < ?").bind(now - 86400000),
        ]);
        const user = await first(env, "SELECT id, email FROM users WHERE lower(email) = lower(?)", [email]);
        if (!user) return;

        const token = randomBase64Url(32);
        tokenHash = await sha256Hex(token);
        await env.DB.prepare(
            "INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        ).bind(tokenHash, user.id, now, now + 30 * 60 * 1000).run();

        // フラグメントはHTTPリクエストやRefererに含まれないため、リンクの秘密をログに残さない。
        const resetUrl = `${config.origin}/reset-password#token=${token}`;
        const sent = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `password-reset/${tokenHash}`,
            },
            body: JSON.stringify({
                from: env.PASSWORD_RESET_FROM,
                to: [user.email],
                subject: "【Family Finance】パスワードの再設定",
                text: `以下のリンクから新しいパスワードを設定してください。\n\n${resetUrl}\n\nリンクの有効期限は30分です。一度使用すると無効になります。\n心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。`,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!sent.ok) throw new Error("Mail delivery failed");
    } catch {
        // 外部サービスの応答やリンクをログ・API応答へ出さない。
        if (tokenHash) {
            await env.DB.prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?").bind(tokenHash).run();
        }
        console.error("Password reset mail delivery failed");
        // 応答を共通に保ち、送信失敗からアカウントの存在が判別されることを防ぐ。
    }
}

async function resetPassword(request, env) {
    const ip = request.headers.get("CF-Connecting-IP") || "local";
    if (!(await allowPasswordResetAttempt(env, `reset-ip:${ip}`, 20))) {
        throw new HttpError(429, "しばらく待ってから、もう一度お試しください。");
    }

    const data = await readJson(request);
    const token = typeof data.token === "string" ? data.token : "";
    const password = typeof data.password === "string" ? data.password : "";
    const errors = {};
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) errors.token = ["再設定リンクが無効か、有効期限が切れています。新しいリンクをご利用ください。"];
    if (password.length < 8 || password.length > 128) errors.password = ["パスワードは8文字以上128文字以内で入力してください。"];
    if (password !== data.password_confirmation) errors.password_confirmation = ["確認用パスワードが一致しません。"];
    throwIfErrors(errors);

    const tokenHash = await sha256Hex(token);
    const reset = await first(env,
        "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ?",
        [tokenHash, Date.now()],
    );
    if (!reset) throw validationError("token", "再設定リンクが無効か、有効期限が切れています。新しいリンクをご利用ください。");

    const passwordHash = await hashPassword(password);
    const now = Date.now();
    // D1のバッチ内で期限とトークンを再確認し、同じリンクの同時使用も一度だけに制限する。
    // 新しいランダムsaltのハッシュを条件に、変更できたアカウントだけのセッションを破棄する。
    const results = await env.DB.batch([
        env.DB.prepare(
            `UPDATE users SET password = ?, remember_token = NULL, updated_at = ?
             WHERE id = ? AND EXISTS (
               SELECT 1 FROM password_reset_tokens WHERE token_hash = ? AND user_id = users.id AND expires_at > ?
             )`,
        ).bind(passwordHash, timestamp(), reset.user_id, tokenHash, now),
        env.DB.prepare(
            `DELETE FROM personal_access_tokens WHERE tokenable_id = ? AND tokenable_type = 'user'
             AND EXISTS (SELECT 1 FROM users WHERE id = ? AND password = ?)`,
        ).bind(reset.user_id, reset.user_id, passwordHash),
        env.DB.prepare(
            `DELETE FROM password_reset_tokens WHERE user_id = ?
             AND EXISTS (SELECT 1 FROM users WHERE id = ? AND password = ?)`,
        ).bind(reset.user_id, reset.user_id, passwordHash),
    ]);
    if (results[0].meta.changes !== 1) {
        throw validationError("token", "再設定リンクが無効か、有効期限が切れています。新しいリンクをご利用ください。");
    }

    return json({ message: "パスワードを再設定しました。新しいパスワードでログインしてください。" });
}

async function authenticate(request, env) {
    const header = request.headers.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        throw new HttpError(401, "Unauthenticated.");
    }

    const tokenHash = await sha256Hex(match[1]);
    const token = await first(
        env,
        "SELECT id, tokenable_id FROM personal_access_tokens WHERE token = ? AND tokenable_type = 'user'",
        [tokenHash],
    );

    if (!token) {
        throw new HttpError(401, "Unauthenticated.");
    }

    const user = await first(env, "SELECT id, name, email FROM users WHERE id = ?", [token.tokenable_id]);

    if (!user) {
        throw new HttpError(401, "Unauthenticated.");
    }

    await env.DB.prepare("UPDATE personal_access_tokens SET last_used_at = ? WHERE id = ?")
        .bind(timestamp(), token.id)
        .run();

    return { token, user };
}

async function me(env, user) {
    return {
        user,
        family: await currentFamily(env, user.id),
    };
}

async function updateFamily(request, env, user) {
    const data = await readJson(request);
    const name = text(data.name);

    if (!name) {
        throw validationError("name", "グループ名を入力してください。");
    }

    const family = await requireFamily(env, user.id);

    await env.DB.prepare("UPDATE families SET name = ?, updated_at = ? WHERE id = ?")
        .bind(name, timestamp(), family.id)
        .run();

    return json(await first(env, "SELECT id, name, created_at, updated_at FROM families WHERE id = ?", [family.id]));
}

async function storeInvitation(request, env, user) {
    const family = await requireFamily(env, user.id);
    const data = await readJson(request);
    const email = text(data.email) || null;
    const token = randomBase64Url(36);
    const now = timestamp();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
        "INSERT INTO family_invitations (family_id, invited_by_user_id, email, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
        .bind(family.id, user.id, email, token, expiresAt, now, now)
        .run();

    return json({
        invite_url: `${new URL(request.url).origin}/register?invite=${token}`,
        expires_at: expiresAt,
    });
}

async function showInvitation(env, token) {
    const invitation = await first(
        env,
        `SELECT i.email, f.id AS family_id, f.name AS family_name
         FROM family_invitations i
         JOIN families f ON f.id = i.family_id
         WHERE i.token = ?
           AND i.accepted_at IS NULL
           AND (i.expires_at IS NULL OR i.expires_at > ?)`,
        [token, timestamp()],
    );

    if (!invitation) {
        throw new HttpError(404, "Not Found");
    }

    return json({
        family: {
            id: invitation.family_id,
            name: invitation.family_name,
        },
        email: invitation.email,
    });
}

async function storeCategory(request, env, user) {
    const data = await readJson(request);
    const name = text(data.name);

    if (!name) {
        throw validationError("name", "カテゴリ名を入力してください。");
    }

    const now = timestamp();
    const result = await env.DB.prepare(
        "INSERT INTO categories (name, created_at, updated_at) VALUES (?, ?, ?)",
    )
        .bind(name, now, now)
        .run();
    const category = await first(env, "SELECT id, name, created_at, updated_at FROM categories WHERE id = ?", [
        result.meta.last_row_id,
    ]);
    const family = await currentFamily(env, user.id);

    if (family) {
        await createDefaultRatios(env, family.id, category);
    }

    return json(category);
}

async function updateCategory(request, env, categoryId) {
    const data = await readJson(request);
    const name = text(data.name);

    if (!name) {
        throw validationError("name", "カテゴリ名を入力してください。");
    }

    await env.DB.prepare("UPDATE categories SET name = ?, updated_at = ? WHERE id = ?")
        .bind(name, timestamp(), categoryId)
        .run();

    const category = await first(env, "SELECT id, name, created_at, updated_at FROM categories WHERE id = ?", [
        categoryId,
    ]);

    if (!category) {
        throw new HttpError(404, "Not Found");
    }

    return json(category);
}

async function listRatios(env, user) {
    const family = await requireFamily(env, user.id);
    const users = await familyUsers(env, family.id);
    const categories = await all(env, "SELECT id, name FROM categories ORDER BY id");
    const ratios = await all(env, "SELECT user_id, category_id, ratio FROM ratios WHERE family_id = ?", [family.id]);

    return {
        users,
        categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            ratios: users.map((member) => {
                const ratio = ratios.find(
                    (item) => item.category_id === category.id && item.user_id === member.id,
                );

                return {
                    user_id: member.id,
                    ratio: ratio ? Number(ratio.ratio) * 100 : "",
                };
            }),
        })),
    };
}

async function updateRatios(request, env, user, categoryId) {
    const family = await requireFamily(env, user.id);
    const data = await readJson(request);
    const ratios = Array.isArray(data.ratios) ? data.ratios : [];
    const now = timestamp();

    for (const item of ratios) {
        const userId = toInteger(item.user_id);
        const ratio = Number(item.ratio);

        if (!userId || Number.isNaN(ratio) || ratio < 0 || ratio > 100) {
            throw validationError("ratios", "割合は0〜100の数字で入力してください。");
        }

        await env.DB.prepare(
            `INSERT INTO ratios (family_id, user_id, category_id, ratio, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(family_id, user_id, category_id)
             DO UPDATE SET ratio = excluded.ratio, updated_at = excluded.updated_at`,
        )
            .bind(family.id, userId, categoryId, ratio / 100, now, now)
            .run();
    }
}

async function expenseOptions(env, user) {
    const family = await requireFamily(env, user.id);

    return {
        users: await familyUsers(env, family.id),
        categories: await all(env, "SELECT id, name FROM categories ORDER BY id"),
    };
}

async function storeExpense(request, env, user) {
    const family = await requireFamily(env, user.id);
    const data = await validateExpensePayload(request, env, family.id);

    await ensureCategoryRatios(env, family.id, data.category_id);

    const now = timestamp();
    const result = await env.DB.prepare(
        `INSERT INTO expenses (family_id, user_id, category_id, amount, income, spent_at, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
        .bind(
            family.id,
            data.user_id,
            data.category_id,
            data.amount,
            data.income,
            data.spent_at,
            data.note,
            now,
            now,
        )
        .run();
    const expenseId = result.meta.last_row_id;

    await replacePersonalExpenses(env, expenseId, data.personal_expenses);

    return json(await expenseWithPersonalExpenses(env, expenseId));
}

async function updateExpense(request, env, user, expenseId) {
    const family = await requireFamily(env, user.id);
    const expense = await first(env, "SELECT id, family_id FROM expenses WHERE id = ?", [expenseId]);

    if (!expense || expense.family_id !== family.id) {
        throw new HttpError(404, "Not Found");
    }

    const data = await validateExpensePayload(request, env, family.id);

    await ensureCategoryRatios(env, family.id, data.category_id);

    await env.DB.prepare(
        `UPDATE expenses
         SET user_id = ?, category_id = ?, amount = ?, income = ?, spent_at = ?, note = ?, updated_at = ?
         WHERE id = ?`,
    )
        .bind(
            data.user_id,
            data.category_id,
            data.amount,
            data.income,
            data.spent_at,
            data.note,
            timestamp(),
            expenseId,
        )
        .run();

    await replacePersonalExpenses(env, expenseId, data.personal_expenses);

    return json(await expenseWithPersonalExpenses(env, expenseId));
}

async function deleteExpense(env, user, expenseId) {
    const family = await requireFamily(env, user.id);
    const expense = await first(env, "SELECT id, family_id FROM expenses WHERE id = ?", [expenseId]);

    if (!expense || expense.family_id !== family.id) {
        throw new HttpError(404, "Not Found");
    }

    await env.DB.prepare("DELETE FROM personal_expenses WHERE expense_id = ?").bind(expenseId).run();
    await env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(expenseId).run();
}

async function monthlyExpenses(env, user, selectedMonth) {
    const family = await requireFamily(env, user.id);
    const users = await familyUsers(env, family.id);
    const expenses = await loadExpenses(env, family.id);
    const monthMap = new Map();

    for (const expense of expenses) {
        const month = expense.spent_at.slice(0, 7);
        const current = monthMap.get(month) || {
            month,
            expense_total: 0,
            income_total: 0,
            personal_total: 0,
            shared_total: 0,
            total: 0,
            count: 0,
        };
        const personalTotalAmount = personalTotal(expense);
        const shared = sharedAmount(expense);

        current.expense_total += Number(expense.amount);
        current.income_total += Number(expense.income || 0);
        current.personal_total += personalTotalAmount;
        current.shared_total += shared;
        current.total += shared;
        current.count += 1;
        monthMap.set(month, current);
    }

    const selectedExpenses = selectedMonth
        ? expenses.filter((expense) => expense.spent_at.slice(0, 7) === selectedMonth)
        : [];

    return {
        months: Array.from(monthMap.values()),
        selected_month: selectedMonth || null,
        category_totals: buildCategoryTotals(selectedExpenses),
        details: buildDetails(selectedExpenses),
        settlement: selectedMonth ? calculateSettlement(selectedExpenses, users) : null,
    };
}

async function showCashFlowForecast(env, user, searchParams) {
    const family = await requireFamily(env, user.id);
    const scope = normalizeScope(searchParams.get("scope"));
    const forecastMonths = normalizeForecastMonths(searchParams.get("forecast_months"));
    const ownerId = ownerIdForScope(scope, user.id);
    const forecast = await first(
        env,
        `SELECT *
         FROM cash_flow_forecasts
         WHERE family_id = ? AND scope = ? AND owner_id = ? AND forecast_months = ?`,
        [family.id, scope, ownerId, forecastMonths],
    );
    const simulationData = await loadSimulationData(env, family.id, scope, ownerId);

    if (forecast) {
        return {
            ...formatForecast(forecast),
            ...simulationData,
        };
    }

    return {
        scope,
        forecast_months: forecastMonths,
        start_month: currentMonth(),
        current_balance: 0,
        fixed_incomes: [],
        variable_incomes: [],
        fixed_expenses: [],
        variable_expenses: [],
        ...simulationData,
    };
}

async function updateCashFlowForecast(request, env, user) {
    const family = await requireFamily(env, user.id);
    const data = validateForecastPayload(await readJson(request));
    const ownerId = ownerIdForScope(data.scope, user.id);
    const now = timestamp();

    await env.DB.prepare(
        `INSERT INTO cash_flow_forecasts (
             family_id, scope, owner_id, forecast_months, start_month, current_balance,
             fixed_incomes, variable_incomes, fixed_expenses, variable_expenses,
             created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(family_id, scope, owner_id, forecast_months)
         DO UPDATE SET
             start_month = excluded.start_month,
             current_balance = excluded.current_balance,
             fixed_incomes = excluded.fixed_incomes,
             variable_incomes = excluded.variable_incomes,
             fixed_expenses = excluded.fixed_expenses,
             variable_expenses = excluded.variable_expenses,
             updated_at = excluded.updated_at`,
    )
        .bind(
            family.id,
            data.scope,
            ownerId,
            data.forecast_months,
            data.start_month,
            data.current_balance,
            JSON.stringify(data.fixed_incomes),
            JSON.stringify(data.variable_incomes),
            JSON.stringify(data.fixed_expenses),
            JSON.stringify(data.variable_expenses),
            now,
            now,
        )
        .run();

    const forecast = await first(
        env,
        `SELECT *
         FROM cash_flow_forecasts
         WHERE family_id = ? AND scope = ? AND owner_id = ? AND forecast_months = ?`,
        [family.id, data.scope, ownerId, data.forecast_months],
    );

    return json(formatForecast(forecast));
}

async function updateCashFlowSimulation(request, env, user) {
    const family = await requireFamily(env, user.id);
    const data = validateSimulationPayload(await readJson(request));
    const ownerId = ownerIdForScope(data.scope, user.id);
    const now = timestamp();
    let forecast = await first(
        env,
        `SELECT *
         FROM cash_flow_forecasts
         WHERE family_id = ? AND scope = ? AND owner_id = ?
         ORDER BY forecast_months
         LIMIT 1`,
        [family.id, data.scope, ownerId],
    );

    if (!forecast) {
        const result = await env.DB.prepare(
            `INSERT INTO cash_flow_forecasts (
                family_id, scope, owner_id, forecast_months, start_month, current_balance,
                fixed_incomes, variable_incomes, fixed_expenses, variable_expenses,
                created_at, updated_at
             )
             VALUES (?, ?, ?, 3, ?, 0, '[]', '[]', '[]', '[]', ?, ?)`,
        )
            .bind(family.id, data.scope, ownerId, currentMonth(), now, now)
            .run();

        forecast = await first(env, "SELECT * FROM cash_flow_forecasts WHERE id = ?", [
            result.meta.last_row_id,
        ]);
    }

    await env.DB.prepare(
        `UPDATE cash_flow_forecasts
         SET simulation_incomes = ?,
             simulation_fixed_expenses = ?,
             simulation_variable_expenses = ?,
             updated_at = ?
         WHERE id = ?`,
    )
        .bind(
            JSON.stringify(data.incomes),
            JSON.stringify(data.fixed_expenses),
            JSON.stringify(data.variable_expenses),
            now,
            forecast.id,
        )
        .run();

    const updated = await first(env, "SELECT * FROM cash_flow_forecasts WHERE id = ?", [forecast.id]);

    return json(formatForecast(updated));
}

async function resolveFamilyForRegistration(env, inviteToken, email) {
    if (inviteToken) {
        const invitation = await first(
            env,
            `SELECT family_id, email
             FROM family_invitations
             WHERE token = ?
               AND accepted_at IS NULL
               AND (expires_at IS NULL OR expires_at > ?)`,
            [inviteToken, timestamp()],
        );

        if (!invitation) {
            throw validationError(
                "invite_token",
                "招待リンクの有効期限が切れているか、すでに使用されています。",
            );
        }

        if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
            throw validationError("email", "招待されたメールアドレスで登録してください。");
        }

        return first(env, "SELECT id, name FROM families WHERE id = ?", [invitation.family_id]);
    }

    const emptyFamily = await first(
        env,
        `SELECT f.id, f.name
         FROM families f
         LEFT JOIN family_user fu ON fu.family_id = f.id
         GROUP BY f.id
         HAVING COUNT(fu.id) = 0
         ORDER BY f.id
         LIMIT 1`,
    );

    if (emptyFamily) {
        return emptyFamily;
    }

    const now = timestamp();
    const result = await env.DB.prepare("INSERT INTO families (name, created_at, updated_at) VALUES ('グループ', ?, ?)")
        .bind(now, now)
        .run();

    return first(env, "SELECT id, name FROM families WHERE id = ?", [result.meta.last_row_id]);
}

async function ensureRegistrationDefaults(env, familyId) {
    const now = timestamp();

    for (const name of DEFAULT_CATEGORIES) {
        await env.DB.prepare(
            "INSERT OR IGNORE INTO categories (name, created_at, updated_at) VALUES (?, ?, ?)",
        )
            .bind(name, now, now)
            .run();
    }

    const categories = await all(env, "SELECT id, name FROM categories ORDER BY id");

    for (const category of categories) {
        await createDefaultRatios(env, familyId, category);
    }
}

async function createDefaultRatios(env, familyId, category) {
    const users = await familyUsers(env, familyId);
    const now = timestamp();

    for (const [index, user] of users.entries()) {
        await env.DB.prepare(
            `INSERT OR IGNORE INTO ratios (family_id, user_id, category_id, ratio, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )
            .bind(familyId, user.id, category.id, defaultRatio(category.name, index, users.length), now, now)
            .run();
    }
}

async function ensureCategoryRatios(env, familyId, categoryId) {
    const category = await first(env, "SELECT id, name FROM categories WHERE id = ?", [categoryId]);

    if (category) {
        await createDefaultRatios(env, familyId, category);
    }
}

function defaultRatio(categoryName, userIndex, userCount) {
    if (userCount === 1) {
        return 1.0;
    }

    if (userCount === 2 && categoryName === "家ローン") {
        return userIndex === 0 ? 0.45 : 0.55;
    }

    const baseRatio = Math.floor(100 / userCount) / 100;

    return userIndex === userCount - 1 ? 1 - baseRatio * (userCount - 1) : baseRatio;
}

async function respondWithToken(env, user) {
    const plainToken = randomBase64Url(32);
    const tokenHash = await sha256Hex(plainToken);
    const now = timestamp();

    await env.DB.prepare(
        `INSERT INTO personal_access_tokens
         (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at)
         VALUES ('user', ?, 'web', ?, '["*"]', ?, ?)`,
    )
        .bind(user.id, tokenHash, now, now)
        .run();

    return {
        token: plainToken,
        user,
        family: await currentFamily(env, user.id),
    };
}

async function currentFamily(env, userId) {
    return first(
        env,
        `SELECT f.id, f.name, f.created_at, f.updated_at
         FROM families f
         JOIN family_user fu ON fu.family_id = f.id
         WHERE fu.user_id = ?
         ORDER BY f.id
         LIMIT 1`,
        [userId],
    );
}

async function requireFamily(env, userId) {
    const family = await currentFamily(env, userId);

    if (!family) {
        throw validationError("family", "グループが見つかりません。");
    }

    return family;
}

async function familyUsers(env, familyId) {
    return all(
        env,
        `SELECT u.id, u.name
         FROM users u
         JOIN family_user fu ON fu.user_id = u.id
         WHERE fu.family_id = ?
         ORDER BY u.id`,
        [familyId],
    );
}

async function validateExpensePayload(request, env, familyId) {
    const data = await readJson(request);
    const familyUserIds = new Set((await familyUsers(env, familyId)).map((user) => user.id));
    const personalExpenses = Array.isArray(data.personal_expenses) ? data.personal_expenses : [];
    const payload = {
        user_id: toInteger(data.user_id),
        category_id: toInteger(data.category_id),
        amount: toInteger(data.amount),
        income: empty(data.income) ? null : toInteger(data.income),
        spent_at: text(data.spent_at),
        note: text(data.note) || null,
        personal_expenses: personalExpenses.map((item) => ({
            user_id: toInteger(item.user_id),
            amount: empty(item.amount) ? 0 : toInteger(item.amount),
            note: text(item.note) || null,
        })),
    };
    const errors = {};

    if (!payload.user_id || !familyUserIds.has(payload.user_id)) {
        errors.user_id = ["支払った人を選択してください。"];
    }

    if (!payload.category_id) errors.category_id = ["カテゴリを選択してください。"];
    if (!payload.amount || payload.amount < 1) errors.amount = ["合計金額は1円以上で入力してください。"];
    if (payload.income !== null && (payload.income < 0 || !Number.isInteger(payload.income))) {
        errors.income = ["収入は0円以上で入力してください。"];
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.spent_at)) {
        errors.spent_at = ["支払日を入力してください。"];
    }

    const category = await first(env, "SELECT id FROM categories WHERE id = ?", [payload.category_id]);

    if (!category) {
        errors.category_id = ["カテゴリを選択してください。"];
    }

    const seenUserIds = new Set();
    let personalTotalAmount = 0;

    for (const item of payload.personal_expenses) {
        if (!item.user_id || !familyUserIds.has(item.user_id) || seenUserIds.has(item.user_id)) {
            errors.personal_expenses = ["個人分の対象者を正しく選択してください。"];
        }

        if (!Number.isInteger(item.amount) || item.amount < 0) {
            errors.personal_expenses = ["個人分は0円以上の整数で入力してください。"];
        }

        seenUserIds.add(item.user_id);
        personalTotalAmount += item.amount || 0;
    }

    if (personalTotalAmount > payload.amount) {
        errors.personal_expenses = ["個人分の合計は合計金額以下にしてください。"];
    }

    throwIfErrors(errors);

    payload.personal_expenses = payload.personal_expenses.filter((item) => item.amount > 0);

    return payload;
}

async function replacePersonalExpenses(env, expenseId, personalExpenses) {
    await env.DB.prepare("DELETE FROM personal_expenses WHERE expense_id = ?").bind(expenseId).run();

    const now = timestamp();

    for (const item of personalExpenses) {
        await env.DB.prepare(
            `INSERT INTO personal_expenses (expense_id, user_id, amount, note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )
            .bind(expenseId, item.user_id, item.amount, item.note, now, now)
            .run();
    }
}

async function expenseWithPersonalExpenses(env, expenseId) {
    const expense = await first(env, "SELECT * FROM expenses WHERE id = ?", [expenseId]);

    if (!expense) {
        throw new HttpError(404, "Not Found");
    }

    expense.personal_expenses = await all(
        env,
        "SELECT user_id, amount, note FROM personal_expenses WHERE expense_id = ? ORDER BY id",
        [expenseId],
    );

    return expense;
}

async function loadExpenses(env, familyId) {
    const rows = await all(
        env,
        `SELECT e.*, u.name AS user, c.name AS category
         FROM expenses e
         JOIN users u ON u.id = e.user_id
         JOIN categories c ON c.id = e.category_id
         WHERE e.family_id = ?
         ORDER BY e.spent_at DESC, e.id DESC`,
        [familyId],
    );
    const personalRows = await all(
        env,
        `SELECT pe.expense_id, pe.user_id, pe.amount, pe.note, u.name AS user
         FROM personal_expenses pe
         JOIN users u ON u.id = pe.user_id
         JOIN expenses e ON e.id = pe.expense_id
         WHERE e.family_id = ?
         ORDER BY pe.id`,
        [familyId],
    );
    const ratioRows = await all(env, "SELECT category_id, user_id, ratio FROM ratios WHERE family_id = ?", [familyId]);

    return rows.map((row) => ({
        ...row,
        personal_expenses: personalRows
            .filter((item) => item.expense_id === row.id)
            .map((item) => ({
                user_id: item.user_id,
                user: item.user,
                amount: item.amount,
                note: item.note,
            })),
        ratios: ratioRows.filter((item) => item.category_id === row.category_id),
    }));
}

function buildCategoryTotals(expenses) {
    const map = new Map();

    for (const expense of expenses) {
        const current = map.get(expense.category_id) || {
            category_id: expense.category_id,
            category: expense.category,
            personal_total: 0,
            personal_totals_map: new Map(),
            shared_total: 0,
            total: 0,
        };

        current.personal_total += personalTotal(expense);
        current.shared_total += sharedAmount(expense);
        current.total += sharedAmount(expense);

        for (const item of expense.personal_expenses) {
            const personal = current.personal_totals_map.get(item.user_id) || {
                user_id: item.user_id,
                user: item.user,
                amount: 0,
            };

            personal.amount += Number(item.amount);
            current.personal_totals_map.set(item.user_id, personal);
        }

        map.set(expense.category_id, current);
    }

    return Array.from(map.values())
        .map((item) => ({
            category_id: item.category_id,
            category: item.category,
            personal_total: item.personal_total,
            personal_totals: Array.from(item.personal_totals_map.values()).filter((personal) => personal.amount > 0),
            shared_total: item.shared_total,
            total: item.total,
        }))
        .sort((a, b) => b.total - a.total);
}

function buildDetails(expenses) {
    return expenses.map((expense) => {
        const net = netAmount(expense);

        return {
            id: expense.id,
            spent_at: expense.spent_at,
            user_id: expense.user_id,
            user: expense.user,
            category_id: expense.category_id,
            category: expense.category,
            amount: expense.amount,
            income: expense.income,
            net_amount: net,
            shared_amount: sharedAmount(expense),
            note: expense.note,
            personal_expenses: expense.personal_expenses,
        };
    });
}

function calculateSettlement(expenses, users) {
    if (users.length === 0) {
        return {
            error: "精算対象のメンバーがいません。",
            users: [],
            transfer: null,
        };
    }

    if (users.length > 2) {
        return {
            error: "精算は2人の場合のみ計算できます。",
            users: [],
            transfer: null,
        };
    }

    const paid = Object.fromEntries(users.map((user) => [user.id, 0]));
    const burdens = Object.fromEntries(users.map((user) => [user.id, 0]));

    for (const expense of expenses) {
        const ratios = new Map(expense.ratios.map((ratio) => [ratio.user_id, Number(ratio.ratio)]));

        if (users.some((user) => !ratios.has(user.id))) {
            return {
                error: `カテゴリ「${expense.category}」の割合が未設定です。`,
                users: [],
                transfer: null,
            };
        }

        const ratioSum = Array.from(ratios.values()).reduce((sum, ratio) => sum + ratio, 0);

        if (Math.abs(ratioSum - 1) > 0.001) {
            return {
                error: `カテゴリ「${expense.category}」の割合の合計が100%ではありません。`,
                users: [],
                transfer: null,
            };
        }

        paid[expense.user_id] += netAmount(expense);

        const personalAmounts = new Map();

        for (const item of expense.personal_expenses) {
            personalAmounts.set(item.user_id, (personalAmounts.get(item.user_id) || 0) + Number(item.amount));
        }

        const shared = sharedAmount(expense);
        let remainingSharedAmount = shared;

        users.forEach((member, index) => {
            const sharedBurden = index === users.length - 1
                ? remainingSharedAmount
                : Math.round(shared * ratios.get(member.id));

            remainingSharedAmount -= sharedBurden;
            burdens[member.id] += sharedBurden + (personalAmounts.get(member.id) || 0);
        });
    }

    const results = users.map((member) => ({
        id: member.id,
        name: member.name,
        paid: paid[member.id],
        burden: burdens[member.id],
        difference: paid[member.id] - burdens[member.id],
    }));
    const receiver = results.find((result) => result.difference > 0);
    const payer = results.find((result) => result.difference < 0);

    return {
        error: null,
        users: results,
        transfer: receiver && payer
            ? {
                from: payer.name,
                to: receiver.name,
                amount: receiver.difference,
            }
            : null,
    };
}

function netAmount(expense) {
    return Number(expense.amount) - Number(expense.income || 0);
}

function personalTotal(expense) {
    return expense.personal_expenses.reduce((sum, item) => sum + Number(item.amount), 0);
}

function sharedAmount(expense) {
    return netAmount(expense) - personalTotal(expense);
}

function validateForecastPayload(data) {
    const forecastMonths = normalizeForecastMonths(data.forecast_months);
    const payload = {
        scope: normalizeScope(data.scope),
        forecast_months: forecastMonths,
        start_month: text(data.start_month),
        current_balance: toInteger(data.current_balance),
        fixed_incomes: normalizeForecastItems(data.fixed_incomes, forecastMonths),
        variable_incomes: normalizeForecastItems(data.variable_incomes, forecastMonths),
        fixed_expenses: normalizeForecastItems(data.fixed_expenses, forecastMonths),
        variable_expenses: normalizeForecastItems(data.variable_expenses, forecastMonths),
    };
    const errors = {};

    if (!["personal", "group"].includes(data.scope)) errors.scope = ["計算方法は個人またはグループを選択してください。"];
    if (!/^\d{4}-\d{2}$/.test(payload.start_month)) errors.start_month = ["開始月を入力してください。"];
    if (!Number.isInteger(payload.current_balance) || payload.current_balance < 0) {
        errors.current_balance = ["現在残高は0円以上で入力してください。"];
    }

    throwIfErrors(errors);

    return payload;
}

function validateSimulationPayload(data) {
    const payload = {
        scope: normalizeScope(data.scope),
        incomes: normalizeSimulationItems(data.incomes),
        fixed_expenses: normalizeSimulationItems(data.fixed_expenses),
        variable_expenses: normalizeSimulationItems(data.variable_expenses),
    };

    if (!["personal", "group"].includes(data.scope)) {
        throw validationError("scope", "計算方法は個人またはグループを選択してください。");
    }

    return payload;
}

function normalizeForecastItems(items, forecastMonths) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.map((item) => ({
        title: text(item.title).slice(0, 50),
        same_amount: Boolean(item.same_amount),
        amounts: Array.isArray(item.amounts)
            ? item.amounts.slice(0, forecastMonths).map((amount) => ({
                month: text(amount.month),
                amount: empty(amount.amount) ? null : toInteger(amount.amount),
            }))
            : [],
    }));
}

function normalizeSimulationItems(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.map((item) => ({
        title: text(item.title).slice(0, 50),
        amount: empty(item.amount) ? null : toInteger(item.amount),
    }));
}

async function loadSimulationData(env, familyId, scope, ownerId) {
    const forecast = await first(
        env,
        `SELECT simulation_incomes, simulation_fixed_expenses, simulation_variable_expenses
         FROM cash_flow_forecasts
         WHERE family_id = ?
           AND scope = ?
           AND owner_id = ?
           AND (
               simulation_incomes IS NOT NULL
               OR simulation_fixed_expenses IS NOT NULL
               OR simulation_variable_expenses IS NOT NULL
           )
         ORDER BY forecast_months
         LIMIT 1`,
        [familyId, scope, ownerId],
    );

    return {
        simulation_incomes: parseJson(forecast?.simulation_incomes, []),
        simulation_fixed_expenses: parseJson(forecast?.simulation_fixed_expenses, []),
        simulation_variable_expenses: parseJson(forecast?.simulation_variable_expenses, []),
    };
}

function formatForecast(forecast) {
    return {
        ...forecast,
        fixed_incomes: parseJson(forecast.fixed_incomes, []),
        variable_incomes: parseJson(forecast.variable_incomes, []),
        fixed_expenses: parseJson(forecast.fixed_expenses, []),
        variable_expenses: parseJson(forecast.variable_expenses, []),
        simulation_incomes: parseJson(forecast.simulation_incomes, []),
        simulation_fixed_expenses: parseJson(forecast.simulation_fixed_expenses, []),
        simulation_variable_expenses: parseJson(forecast.simulation_variable_expenses, []),
    };
}

function normalizeScope(scope) {
    return ["personal", "group"].includes(scope) ? scope : "personal";
}

function ownerIdForScope(scope, userId) {
    return scope === "group" ? 0 : userId;
}

function normalizeForecastMonths(value) {
    const months = Number(value || 3);

    return [3, 6].includes(months) ? months : 3;
}

function currentMonth() {
    const today = new Date();

    return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100000;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt,
            iterations,
        },
        key,
        256,
    );

    return `pbkdf2$${iterations}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password, storedHash) {
    if (String(storedHash || "").startsWith("$2")) {
        // Laravelのbcryptは$2y$形式で保存される。bcryptjsは$2b$として検証できる。
        const bcryptHash = storedHash.replace(/^\$2y\$/, "$2b$");

        return bcrypt.compare(password, bcryptHash);
    }

    const parts = String(storedHash || "").split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
        return false;
    }

    const [, iterations, saltHex, hashHex] = parts;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt: hexToBytes(saltHex),
            iterations: Number(iterations),
        },
        key,
        256,
    );
    const candidate = bytesToHex(new Uint8Array(bits));

    return timingSafeEqual(candidate, hashHex);
}

async function sha256Hex(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));

    return bytesToHex(new Uint8Array(digest));
}

function timingSafeEqual(left, right) {
    if (left.length !== right.length) {
        return false;
    }

    let result = 0;

    for (let i = 0; i < left.length; i += 1) {
        result |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }

    return result === 0;
}

function randomBase64Url(byteLength) {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);

    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }

    return bytes;
}

async function readJson(request) {
    const textBody = await request.text();

    if (!textBody) {
        return {};
    }

    try {
        const data = JSON.parse(textBody);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Expected a JSON object");
        }
        return data;
    } catch {
        throw new HttpError(400, "Invalid JSON");
    }
}

async function first(env, sql, params = []) {
    return env.DB.prepare(sql).bind(...params).first();
}

async function all(env, sql, params = []) {
    const result = await env.DB.prepare(sql).bind(...params).all();

    return result.results || [];
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: JSON_HEADERS,
    });
}

function text(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function empty(value) {
    return value === null || value === undefined || value === "";
}

function toInteger(value) {
    if (empty(value)) {
        return null;
    }

    if (Number.isInteger(value)) {
        return value;
    }

    if (typeof value === "string" && /^-?\d+$/.test(value)) {
        return Number(value);
    }

    return Number.NaN;
}

function parseJson(value, fallback) {
    if (!value) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function timestamp() {
    return new Date().toISOString();
}

function validationError(field, message) {
    return new HttpError(422, "The given data was invalid.", {
        [field]: [message],
    });
}

function throwIfErrors(errors) {
    if (Object.keys(errors).length > 0) {
        throw new HttpError(422, "The given data was invalid.", errors);
    }
}

function isLegacyLaravelAsset(pathname) {
    return pathname === "/index.php" || pathname === "/.htaccess" || pathname.startsWith("/build/");
}
