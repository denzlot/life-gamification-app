ALTER TABLE quest_steps
    ADD COLUMN baseline_scheduled_date DATE;

UPDATE quest_steps
SET baseline_scheduled_date = scheduled_date
WHERE baseline_scheduled_date IS NULL;

ALTER TABLE quest_steps
    ALTER COLUMN baseline_scheduled_date SET NOT NULL;
