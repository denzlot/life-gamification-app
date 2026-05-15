ALTER TABLE habits ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20) NOT NULL DEFAULT 'WEEKLY';
ALTER TABLE habits ADD COLUMN IF NOT EXISTS monthly_day INTEGER;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS interval_days INTEGER;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS interval_start_date DATE;

UPDATE habits
SET schedule_type = 'WEEKLY'
WHERE schedule_type IS NULL OR schedule_type = '';
