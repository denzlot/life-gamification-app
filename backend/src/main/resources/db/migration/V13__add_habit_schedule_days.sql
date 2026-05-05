-- Habit schedule: which weekdays a habit should appear in a day plan.
-- ISO weekday numbers: 1 Monday ... 7 Sunday.
ALTER TABLE habits ADD COLUMN IF NOT EXISTS schedule_days VARCHAR(32) NOT NULL DEFAULT '1,2,3,4,5,6,7';
UPDATE habits SET schedule_days = '1,2,3,4,5,6,7' WHERE schedule_days IS NULL OR schedule_days = '';
