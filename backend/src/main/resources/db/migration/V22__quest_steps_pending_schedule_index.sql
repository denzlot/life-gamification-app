CREATE INDEX idx_quest_steps_status_scheduled_quest
    ON quest_steps(status, scheduled_date, quest_id);
