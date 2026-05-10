ALTER TABLE daily_plan_items
    ADD COLUMN IF NOT EXISTS focus_spent_seconds INTEGER;

ALTER TABLE focus_sessions
    ADD COLUMN IF NOT EXISTS planned_duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS actual_elapsed_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS overtime_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS credited_duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS credited_mode VARCHAR(20);

UPDATE focus_sessions
SET planned_duration_seconds = COALESCE(planned_duration_seconds, duration_seconds),
    actual_elapsed_seconds = COALESCE(actual_elapsed_seconds, duration_seconds),
    overtime_seconds = COALESCE(overtime_seconds, 0),
    credited_duration_seconds = COALESCE(credited_duration_seconds, duration_seconds),
    credited_mode = COALESCE(credited_mode, 'PLANNED');

ALTER TABLE focus_sessions
    ALTER COLUMN planned_duration_seconds SET NOT NULL,
    ALTER COLUMN actual_elapsed_seconds SET NOT NULL,
    ALTER COLUMN overtime_seconds SET NOT NULL,
    ALTER COLUMN credited_duration_seconds SET NOT NULL,
    ALTER COLUMN credited_mode SET NOT NULL;

ALTER TABLE focus_sessions
    ADD CONSTRAINT chk_focus_sessions_planned_duration_positive CHECK (planned_duration_seconds > 0),
    ADD CONSTRAINT chk_focus_sessions_actual_elapsed_positive CHECK (actual_elapsed_seconds > 0),
    ADD CONSTRAINT chk_focus_sessions_overtime_non_negative CHECK (overtime_seconds >= 0),
    ADD CONSTRAINT chk_focus_sessions_credited_duration_positive CHECK (credited_duration_seconds > 0),
    ADD CONSTRAINT chk_focus_sessions_credited_mode CHECK (credited_mode IN ('PLANNED', 'ACTUAL'));

ALTER TABLE daily_plan_items
    ADD CONSTRAINT chk_daily_plan_items_focus_spent_non_negative CHECK (focus_spent_seconds IS NULL OR focus_spent_seconds >= 0);
