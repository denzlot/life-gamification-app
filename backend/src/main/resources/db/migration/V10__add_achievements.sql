CREATE TABLE achievements (
                              id              BIGSERIAL PRIMARY KEY,
                              key             VARCHAR(50) NOT NULL UNIQUE,
                              title           VARCHAR(160) NOT NULL,
                              description     TEXT,
                              icon_key        VARCHAR(50),
                              category        VARCHAR(20) NOT NULL,
                              required_value  INTEGER NOT NULL DEFAULT 0,
                              xp_reward       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE user_achievements (
                                   id              BIGSERIAL PRIMARY KEY,
                                   user_id         BIGINT NOT NULL REFERENCES users(id),
                                   achievement_id  BIGINT NOT NULL REFERENCES achievements(id),
                                   unlocked_at     TIMESTAMP NOT NULL,
                                   CONSTRAINT uk_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Стартовые достижения
INSERT INTO achievements (key, title, description, category, required_value, xp_reward) VALUES
 ('streak_7',   'Неделя без пропусков',  '7 дней подряд',     'STREAK',  7,   50),
 ('streak_30',  'Месяц дисциплины',      '30 дней подряд',    'STREAK',  30,  200),
 ('streak_100', 'Легейнда',               '100 дней подряд',   'STREAK',  100, 1000),
 ('level_5',    'Набирает обороты',      'Достиг уровня 5',   'LEVEL',   5,   100),
 ('level_10',   'Ветеран',               'Достиг уровня 10',  'LEVEL',   10,  250),
 ('level_20',   'Мастер',                'Достиг уровня 20',  'LEVEL',   20,  500),
 ('tasks_10',   'Первые шаги',           '10 задач выполнено','TASKS',   10,  25),
 ('tasks_100',  'Сотня',                 '100 задач',         'TASKS',   100, 150),
 ('habits_50',  'Привычка привилась',    '50 выполнений',     'HABITS',  50,  100),
 ('quests_1',   'Первый квест',          '1 квест завершён',  'QUESTS',  1,   75),
 ('shield_used','Щит сработал',          'Щит защитил стрик', 'SPECIAL', 1,   50),
 ('full_hp',    'В идеальной форме',     'HP = 100',          'SPECIAL', 100, 30);