CREATE TABLE quests (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL REFERENCES users(id),

    title VARCHAR(160) NOT NULL,
    description TEXT,

    difficulty VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,

    start_date DATE NOT NULL,
    target_date DATE NOT NULL,

    duration_days INTEGER NOT NULL,
    total_steps INTEGER NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT chk_quests_duration_days_positive CHECK (duration_days > 0),
    CONSTRAINT chk_quests_total_steps_positive CHECK (total_steps > 0)
);

CREATE TABLE quest_steps (
    id BIGSERIAL PRIMARY KEY,

    quest_id BIGINT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,

    step_number INTEGER NOT NULL,

    title VARCHAR(160) NOT NULL,
    description TEXT,

    scheduled_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,

    CONSTRAINT uk_quest_steps_quest_number UNIQUE (quest_id, step_number),
    CONSTRAINT chk_quest_steps_step_number_positive CHECK (step_number > 0)
);

CREATE INDEX idx_quests_user_id ON quests(user_id);
CREATE INDEX idx_quests_user_status ON quests(user_id, status);
CREATE INDEX idx_quest_steps_quest_id ON quest_steps(quest_id);
CREATE INDEX idx_quest_steps_scheduled_date ON quest_steps(scheduled_date);
CREATE INDEX idx_quest_steps_status ON quest_steps(status);
