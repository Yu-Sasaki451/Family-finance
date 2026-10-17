CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_index ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_index ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS password_reset_rate_limits (
    key TEXT PRIMARY KEY,
    window_started INTEGER NOT NULL,
    attempts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS password_reset_limits_window_index ON password_reset_rate_limits (window_started);
