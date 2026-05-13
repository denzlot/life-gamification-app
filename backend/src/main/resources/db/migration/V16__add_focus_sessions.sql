CREATE TABLE focus_sessions (
    id BIGSERIAL PRIMARY KEY,

    session_id VARCHAR(80) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),

    source_type VARCHAR(20) NOT NULL,
    source_id BIGINT,
    title VARCHAR(160) NOT NULL,

    duration_seconds INTEGER NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    plan_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT uk_focus_sessions_user_session UNIQUE (user_id, session_id),
    CONSTRAINT chk_focus_sessions_duration_positive CHECK (duration_seconds > 0)
);

CREATE INDEX idx_focus_sessions_user_completed ON focus_sessions(user_id, completed_at DESC);
CREATE INDEX idx_focus_sessions_user_source ON focus_sessions(user_id, source_type, source_id);
CREATE INDEX idx_focus_sessions_user_plan_date ON focus_sessions(user_id, plan_date);
