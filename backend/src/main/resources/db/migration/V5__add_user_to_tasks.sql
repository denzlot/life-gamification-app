ALTER TABLE tasks
    ADD COLUMN user_id BIGINT;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_user
        FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);