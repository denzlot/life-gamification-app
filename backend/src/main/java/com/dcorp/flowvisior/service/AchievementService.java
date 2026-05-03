package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.AchievementRepository;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import com.dcorp.flowvisior.repository.UserAchievementRepository;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final UserGameStatsRepository userGameStatsRepository;
    private final ActivityLogRepository activityLogRepository;

    public AchievementService(
            AchievementRepository achievementRepository,
            UserAchievementRepository userAchievementRepository,
            UserGameStatsRepository userGameStatsRepository,
            ActivityLogRepository activityLogRepository
    ) {
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
        this.userGameStatsRepository = userGameStatsRepository;
        this.activityLogRepository = activityLogRepository;
    }

    @Transactional
    public List<String> checkAndGrant(User user) {
        UserGameStats stats = userGameStatsRepository.findByUser(user)
                .orElseThrow();

        // Получаем ключи уже разблокированных достижений
        Set<String> unlocked = userAchievementRepository.findUnlockedKeysByUser(user);

        // Получаем все достижения из системы
        List<Achievement> all = achievementRepository.findAll();

        List<String> newlyUnlocked = new java.util.ArrayList<>();

        for (Achievement achievement : all) {
            if (unlocked.contains(achievement.getKey())) {
                continue; // уже разблокировано
            }

            if (isUnlocked(achievement, stats, user)) {
                userAchievementRepository.save(new UserAchievement(user, achievement));

                // Начисляем XP за достижение если есть
                if (achievement.getXpReward() > 0) {
                    stats.addXp(achievement.getXpReward());
                    userGameStatsRepository.save(stats);
                }

                newlyUnlocked.add(achievement.getKey());
            }
        }

        return newlyUnlocked;
    }

    private boolean isUnlocked(Achievement achievement, UserGameStats stats, User user) {
        return switch (achievement.getKey()) {
            case "streak_7"   -> stats.getStreak() >= 7;
            case "streak_30"  -> stats.getStreak() >= 30;
            case "streak_100" -> stats.getStreak() >= 100;
            case "level_5"    -> stats.getLevel() >= 5;
            case "level_10"   -> stats.getLevel() >= 10;
            case "level_20"   -> stats.getLevel() >= 20;
            case "tasks_10"   -> countCompletedBySource(user, ActivitySourceType.TASK) >= 10;
            case "tasks_100"  -> countCompletedBySource(user, ActivitySourceType.TASK) >= 100;
            case "habits_50"  -> countCompletedBySource(user, ActivitySourceType.HABIT) >= 50;
            case "quests_1"   -> countCompletedBySource(user, ActivitySourceType.QUEST) >= 1;
            case "shield_used"-> hasShieldBeenUsed(user);
            case "full_hp"    -> stats.getHp() >= stats.getMaxHp();
            default -> false;
        };
    }

    private long countCompletedBySource(User user, ActivitySourceType sourceType) {
        return activityLogRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .filter(log -> log.getAction() == ActivityAction.COMPLETED)
                .filter(log -> log.getDailyPlanItem() != null)
                .filter(log -> log.getDailyPlanItem().getSourceType() == sourceType)
                .count();
    }

    private boolean hasShieldBeenUsed(User user) {
        return activityLogRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .anyMatch(log -> log.getAction() == ActivityAction.DAY_CLOSED
                        && !log.isStreakShieldAfter()
                        && log.getStreakAfter() > 0);
    }
}