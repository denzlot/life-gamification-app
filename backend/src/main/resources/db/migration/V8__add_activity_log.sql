CREATE TABLE activity_log (
                              id                  BIGSERIAL PRIMARY KEY,
                              user_id             BIGINT NOT NULL REFERENCES users(id),
                              daily_plan_id       BIGINT REFERENCES daily_plans(id) ON DELETE SET NULL,
                              daily_plan_item_id  BIGINT REFERENCES daily_plan_items(id) ON DELETE SET NULL,
                              action              VARCHAR(20) NOT NULL,
                              xp_delta            INTEGER NOT NULL DEFAULT 0,
                              hp_delta            INTEGER NOT NULL DEFAULT 0,
                              xp_after            INTEGER NOT NULL DEFAULT 0,
                              hp_after            INTEGER NOT NULL DEFAULT 0,
                              streak_after        INTEGER NOT NULL DEFAULT 0,
                              streak_shield_after BOOLEAN NOT NULL DEFAULT FALSE,
                              created_at          TIMESTAMP NOT NULL
);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_item_id ON activity_log(daily_plan_item_id, created_at DESC);