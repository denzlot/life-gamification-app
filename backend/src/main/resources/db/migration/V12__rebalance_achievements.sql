-- Clean up achievement copy and make streak achievements meaningful in the no-difficulty model.
UPDATE achievements SET
    title = 'Легенда стрика',
    description = '100 дней подряд. Полностью восстанавливает HP.',
    xp_reward = 1000
WHERE key = 'streak_100';

UPDATE achievements SET
    description = '7 дней подряд. Даёт XP, немного HP и щит стрика.',
    xp_reward = 70
WHERE key = 'streak_7';

UPDATE achievements SET
    description = '30 дней подряд. Большая награда за стабильность.',
    xp_reward = 250
WHERE key = 'streak_30';
