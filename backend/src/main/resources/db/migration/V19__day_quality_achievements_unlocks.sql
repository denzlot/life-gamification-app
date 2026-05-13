ALTER TABLE daily_plans
    ADD COLUMN total_count_at_close INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN completion_rate_at_close DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN day_quality VARCHAR(20) NOT NULL DEFAULT 'EMPTY';

ALTER TABLE user_game_stats
    ADD COLUMN selected_theme VARCHAR(40) NOT NULL DEFAULT 'dark',
    ADD COLUMN selected_character VARCHAR(40) NOT NULL DEFAULT 'lolbot';

CREATE TABLE user_unlocks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    unlock_key VARCHAR(80) NOT NULL,
    unlocked_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_user_unlock UNIQUE (user_id, unlock_key)
);

CREATE INDEX idx_user_unlocks_user ON user_unlocks(user_id);

UPDATE achievements SET
    key = 'tasks_completed_10',
    title = 'Первые шаги',
    description = 'Выполните 10 задач всего',
    category = 'TASKS',
    required_value = 10,
    xp_reward = 150
WHERE key = 'tasks_10'
  AND NOT EXISTS (SELECT 1 FROM achievements WHERE key = 'tasks_completed_10');

UPDATE achievements SET
    key = 'tasks_completed_100',
    title = 'Сотня дел',
    description = 'Выполните 100 задач всего',
    category = 'TASKS',
    required_value = 100,
    xp_reward = 800
WHERE key = 'tasks_100'
  AND NOT EXISTS (SELECT 1 FROM achievements WHERE key = 'tasks_completed_100');

UPDATE achievements SET
    key = 'quest_completed_1',
    title = 'Первый завершённый квест',
    description = 'Завершите первый квест',
    category = 'QUESTS',
    required_value = 1,
    xp_reward = 250
WHERE key = 'quests_1'
  AND NOT EXISTS (SELECT 1 FROM achievements WHERE key = 'quest_completed_1');

INSERT INTO achievements (key, title, description, category, required_value, xp_reward) VALUES
 ('first_task_created', 'Первая задача', 'Создайте первую задачу', 'START', 1, 50),
 ('first_habit_created', 'Первая привычка', 'Создайте первую привычку', 'START', 1, 75),
 ('first_quest_created', 'Первый квест', 'Создайте первый квест', 'START', 1, 100),
 ('first_focus_completed', 'Первый фокус', 'Завершите первую Focus-сессию', 'START', 1, 100),
 ('first_productive_day', 'День не потерян', 'Закройте первый продуктивный день', 'START', 1, 100),
 ('tasks_completed_1', 'Первое дело', 'Выполните первую задачу', 'TASKS', 1, 75),
 ('tasks_completed_10', 'Первые шаги', 'Выполните 10 задач всего', 'TASKS', 10, 150),
 ('tasks_completed_50', 'Рабочий ритм', 'Выполните 50 задач всего', 'TASKS', 50, 400),
 ('tasks_completed_100', 'Сотня дел', 'Выполните 100 задач всего', 'TASKS', 100, 800),
 ('habit_completed_1', 'Первое повторение', 'Выполните привычку впервые', 'HABITS', 1, 75),
 ('habit_streak_10', 'Привычка держится', 'Выполняйте одну привычку 10 дней подряд', 'HABITS', 10, 300),
 ('habit_streak_30', 'Привычка закрепилась', 'Выполняйте одну привычку 30 дней подряд', 'HABITS', 30, 900),
 ('quest_step_completed_1', 'Первый шаг', 'Выполните первый шаг квеста', 'QUESTS', 1, 100),
 ('quest_completed_1', 'Первый завершённый квест', 'Завершите первый квест', 'QUESTS', 1, 250),
 ('quest_completed_5', 'Искатель маршрутов', 'Завершите 5 квестов', 'QUESTS', 5, 700),
 ('quest_30_steps_completed', 'Большой поход', 'Завершите квест из 30 или более шагов', 'QUESTS', 1, 1000),
 ('focus_completed_1', 'Вошёл в поток', 'Завершите первую Focus-сессию', 'FOCUS', 1, 100),
 ('focus_total_1h', 'Первый час фокуса', 'Накопите 1 час засчитанного Focus-времени', 'FOCUS', 1, 150),
 ('focus_total_10h', 'Глубокая работа', 'Накопите 10 часов засчитанного Focus-времени', 'FOCUS', 10, 700),
 ('focus_overtime_1', 'Сверх плана', 'Завершите Focus-сессию с overtime', 'FOCUS', 1, 100),
 ('focus_early_finish_1', 'Короткий рывок', 'Досрочно завершите Focus-сессию и отметьте задачу', 'FOCUS', 1, 75),
 ('streak_3', 'Три дня подряд', 'Поддерживайте стрик 3 дня', 'STREAK', 3, 150),
 ('streak_14', 'Две недели темпа', 'Поддерживайте стрик 14 дней', 'STREAK', 14, 600),
 ('good_day_1', 'Хороший день', 'Закройте день с оценкой Хороший', 'DAYS', 1, 100),
 ('good_days_7', 'Хорошая неделя', 'Накопите 7 хороших дней', 'DAYS', 7, 300),
 ('normal_or_better_days_7', 'Ритм найден', 'Закройте 7 дней с оценкой Нормальный или Хороший', 'DAYS', 7, 250)
ON CONFLICT (key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    required_value = EXCLUDED.required_value,
    xp_reward = EXCLUDED.xp_reward;

UPDATE achievements SET title = 'Три дня подряд', description = 'Поддерживайте стрик 3 дня', required_value = 3, xp_reward = 150 WHERE key = 'streak_3';
UPDATE achievements SET title = 'Неделя движения', description = 'Поддерживайте стрик 7 дней', required_value = 7, xp_reward = 350 WHERE key = 'streak_7';
UPDATE achievements SET title = 'Две недели темпа', description = 'Поддерживайте стрик 14 дней', required_value = 14, xp_reward = 600 WHERE key = 'streak_14';
UPDATE achievements SET title = 'Месяц дисциплины', description = 'Поддерживайте стрик 30 дней', required_value = 30, xp_reward = 1500 WHERE key = 'streak_30';
UPDATE achievements SET title = 'Легенда стрика', description = 'Поддерживайте стрик 100 дней', required_value = 100, xp_reward = 5000 WHERE key = 'streak_100';
