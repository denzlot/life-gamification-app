ALTER TABLE users
    ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
    ADD COLUMN IF NOT EXISTS telegram_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS telegram_planned_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS telegram_deadline_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_telegram_chat_id
    ON users (telegram_chat_id)
    WHERE telegram_chat_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS telegram_link_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_link_codes_code_hash
    ON telegram_link_codes (code_hash);

CREATE TABLE IF NOT EXISTS telegram_callback_tokens (
    id BIGSERIAL PRIMARY KEY,
    nonce VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_plan_item_id BIGINT NOT NULL REFERENCES daily_plan_items(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_callback_tokens_nonce
    ON telegram_callback_tokens (nonce);

CREATE TABLE IF NOT EXISTS telegram_sent_reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_plan_item_id BIGINT NOT NULL REFERENCES daily_plan_items(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_telegram_sent_reminders_item_type
        UNIQUE (user_id, daily_plan_item_id, reminder_type)
);
