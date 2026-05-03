CREATE TABLE activity_log (
                              id                  BIGSERIAL PRIMARY KEY,
                              user_id             BIGINT NOT NULL REFERENCES users(id),
                              daily_plan_id       BIGINT REFERENCES daily_plans(id),
                              daily_plan_item_id  BIGINT REFERENCES daily_plan_items(id),
                              action              VARCHAR(20) NOT NULL,
                              xp_delta            INT NOT NULL DEFAULT 0,
                              hp_delta            INT NOT NULL DEFAULT 0,
                              xp_after            INT NOT NULL DEFAULT 0,
                              hp_after            INT NOT NULL DEFAULT 0,
                              streak_after        INT NOT NULL DEFAULT 0,
                              streak_shield_after BOOLEAN NOT NULL DEFAULT FALSE,
                              created_at          TIMESTAMP NOT NULL
);