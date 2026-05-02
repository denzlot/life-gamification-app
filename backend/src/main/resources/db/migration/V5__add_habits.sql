CREATE TABLE habits (
                        id BIGSERIAL PRIMARY KEY,

                        user_id BIGINT NOT NULL REFERENCES users(id),

                        title VARCHAR(160) NOT NULL,
                        description TEXT,

                        difficulty VARCHAR(20) NOT NULL,

                        active BOOLEAN NOT NULL DEFAULT TRUE,

                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_user_active ON habits(user_id, active);