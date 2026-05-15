DELETE FROM user_achievements
WHERE achievement_id IN (
    SELECT id
    FROM achievements
    WHERE key IN ('first_task_created', 'first_habit_created', 'first_quest_created')
);

DELETE FROM achievements
WHERE key IN ('first_task_created', 'first_habit_created', 'first_quest_created');
