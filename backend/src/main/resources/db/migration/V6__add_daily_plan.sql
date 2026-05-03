CREATE TABLE daily_plans (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL REFERENCES users(id),

    plan_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    closed_at TIMESTAMP,

    CONSTRAINT uk_daily_plans_user_date UNIQUE (user_id, plan_date)
);

CREATE TABLE daily_plan_items (
                                  id BIGSERIAL PRIMARY KEY,

                                  daily_plan_id BIGINT NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,

                                  source_type VARCHAR(20) NOT NULL,
                                  source_id BIGINT,

                                  title VARCHAR(160) NOT NULL,
                                  status VARCHAR(20) NOT NULL,

                                  xp_reward INTEGER NOT NULL DEFAULT 0,
                                  hp_delta_complete INTEGER NOT NULL DEFAULT 0,
                                  hp_delta_fail INTEGER NOT NULL DEFAULT 0,

                                  created_at TIMESTAMP NOT NULL,
                                  completed_at TIMESTAMP
);

CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, plan_date);
CREATE INDEX idx_daily_plan_items_plan_id ON daily_plan_items(daily_plan_id);
CREATE INDEX idx_daily_plan_items_status ON daily_plan_items(status);