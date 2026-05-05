-- New gameplay model: no per-item difficulty, XP/HP comes from streaks and achievements.
ALTER TABLE tasks DROP COLUMN IF EXISTS difficulty;
ALTER TABLE habits DROP COLUMN IF EXISTS difficulty;
ALTER TABLE quests DROP COLUMN IF EXISTS difficulty;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_time TIME;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS planned_time TIME;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS planned_time TIME;
ALTER TABLE quest_steps ADD COLUMN IF NOT EXISTS planned_time TIME;
ALTER TABLE daily_plan_items ADD COLUMN IF NOT EXISTS planned_time TIME;
