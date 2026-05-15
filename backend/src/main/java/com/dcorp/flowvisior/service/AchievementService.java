package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.achievement.AchievementResponse;
import com.dcorp.flowvisior.dto.focus.FocusCreditedMode;
import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final UserGameStatsRepository userGameStatsRepository;
    private final ActivityLogRepository activityLogRepository;
    private final TaskRepository taskRepository;
    private final HabitRepository habitRepository;
    private final QuestRepository questRepository;
    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final FocusSessionRepository focusSessionRepository;

    public AchievementService(
            AchievementRepository achievementRepository,
            UserAchievementRepository userAchievementRepository,
            UserGameStatsRepository userGameStatsRepository,
            ActivityLogRepository activityLogRepository,
            TaskRepository taskRepository,
            HabitRepository habitRepository,
            QuestRepository questRepository,
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            FocusSessionRepository focusSessionRepository
    ) {
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
        this.userGameStatsRepository = userGameStatsRepository;
        this.activityLogRepository = activityLogRepository;
        this.taskRepository = taskRepository;
        this.habitRepository = habitRepository;
        this.questRepository = questRepository;
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.focusSessionRepository = focusSessionRepository;
    }

    @Transactional
    public List<String> checkAndGrant(User user) {
        UserGameStats stats = userGameStatsRepository.findByUser(user)
                .orElseThrow();
        Set<String> unlocked = userAchievementRepository.findUnlockedKeysByUser(user);
        AchievementProgressSnapshot progress = progressSnapshot(user, stats);
        List<String> newlyUnlocked = new ArrayList<>();

        for (Achievement achievement : achievementRepository.findAllByOrderByIdAsc()) {
            if (unlocked.contains(achievement.getKey())) {
                continue;
            }

            if (progress.progressFor(achievement.getKey()) >= achievement.getRequiredValue()) {
                userAchievementRepository.save(new UserAchievement(user, achievement));
                unlocked.add(achievement.getKey());

                if (achievement.getXpReward() > 0) {
                    stats.addXp(achievement.getXpReward());
                    stats.recalculateLevel();
                    userGameStatsRepository.save(stats);
                }

                newlyUnlocked.add(achievement.getKey());
            }
        }

        return newlyUnlocked;
    }

    @Transactional(readOnly = true)
    public List<AchievementResponse> getCatalog(User user) {
        UserGameStats stats = userGameStatsRepository.findByUser(user)
                .orElseThrow();
        AchievementProgressSnapshot progress = progressSnapshot(user, stats);
        Map<String, UserAchievement> unlocked = userAchievementRepository.findByUserWithAchievementOrderByUnlockedAtDesc(user)
                .stream()
                .collect(Collectors.toMap(ua -> ua.getAchievement().getKey(), Function.identity()));

        return achievementRepository.findAllByOrderByIdAsc()
                .stream()
                .map(achievement -> {
                    UserAchievement userAchievement = unlocked.get(achievement.getKey());
                    int currentProgress = progress.progressFor(achievement.getKey());
                    return new AchievementResponse(
                            achievement,
                            userAchievement != null,
                            userAchievement == null ? null : userAchievement.getUnlockedAt(),
                            Math.min(currentProgress, achievement.getRequiredValue())
                    );
                })
                .toList();
    }

    private AchievementProgressSnapshot progressSnapshot(User user, UserGameStats stats) {
        List<DailyPlan> plans = dailyPlanRepository.findByUserOrderByPlanDateAsc(user);
        List<DailyPlanItem> planItems = plans.isEmpty()
                ? List.of()
                : dailyPlanItemRepository.findByDailyPlanIn(plans);

        return new AchievementProgressSnapshot(
                stats,
                taskRepository.countByUser(user),
                habitRepository.countByUser(user),
                questRepository.countByUser(user),
                focusSessionRepository.countByUser(user),
                questRepository.countByUserAndStatus(user, QuestStatus.COMPLETED),
                questRepository.countByUserAndStatusAndTotalStepsGreaterThanEqual(user, QuestStatus.COMPLETED, 30),
                focusSessionRepository.sumDurationSeconds(user),
                focusSessionRepository.existsByUserAndOvertimeSecondsGreaterThan(user, 0),
                plans,
                planItems,
                focusSessionRepository.findByUserOrderByCompletedAtDesc(user),
                activityLogRepository.findByUserOrderByCreatedAtDesc(user)
        );
    }

    private record AchievementProgressSnapshot(
            UserGameStats stats,
            long taskCount,
            long habitCount,
            long questCount,
            long focusCount,
            int completedQuestCount,
            int completedLongQuestCount,
            long focusDurationSeconds,
            boolean hasOvertimeFocus,
            List<DailyPlan> plans,
            List<DailyPlanItem> planItems,
            List<FocusSession> focusSessions,
            List<ActivityLog> activityLogs
    ) {
        int progressFor(String key) {
            return switch (key) {
                case "first_task_created" -> countAtLeast(taskCount);
                case "first_habit_created" -> countAtLeast(habitCount);
                case "first_quest_created" -> countAtLeast(questCount);
                case "first_focus_completed", "focus_completed_1" -> countAtLeast(focusCount);
                case "first_productive_day" -> countProductiveDays();
                case "tasks_completed_1" -> uniqueCompletedSourceCount(ActivitySourceType.TASK, false);
                case "tasks_completed_10", "tasks_10" -> uniqueCompletedSourceCount(ActivitySourceType.TASK, false);
                case "tasks_completed_50" -> uniqueCompletedSourceCount(ActivitySourceType.TASK, false);
                case "tasks_completed_100", "tasks_100" -> uniqueCompletedSourceCount(ActivitySourceType.TASK, false);
                case "habit_completed_1" -> completedItemCount(ActivitySourceType.HABIT);
                case "habit_streak_10" -> maxHabitStreak();
                case "habit_streak_30" -> maxHabitStreak();
                case "habits_50" -> completedItemCount(ActivitySourceType.HABIT);
                case "quest_step_completed_1" -> uniqueCompletedSourceCount(ActivitySourceType.QUEST, false);
                case "quest_completed_1", "quests_1" -> completedQuestCount;
                case "quest_completed_5" -> completedQuestCount;
                case "quest_30_steps_completed" -> completedLongQuestCount;
                case "focus_total_1h" -> (int) (focusDurationSeconds / 3600);
                case "focus_total_10h" -> (int) (focusDurationSeconds / 3600);
                case "focus_overtime_1" -> hasOvertimeFocus ? 1 : 0;
                case "focus_early_finish_1" -> hasEarlyFinishFocus() ? 1 : 0;
                case "streak_3" -> stats.getStreak();
                case "streak_7" -> stats.getStreak();
                case "streak_14" -> stats.getStreak();
                case "streak_30" -> stats.getStreak();
                case "streak_100" -> stats.getStreak();
                case "good_day_1" -> countDaysByQuality(Set.of(DayQuality.GOOD));
                case "good_days_7" -> countDaysByQuality(Set.of(DayQuality.GOOD));
                case "normal_or_better_days_7" -> countDaysByQuality(Set.of(DayQuality.NORMAL, DayQuality.GOOD));
                case "level_5" -> stats.getLevel();
                case "level_10" -> stats.getLevel();
                case "level_20" -> stats.getLevel();
                case "shield_used" -> hasShieldBeenUsed() ? 1 : 0;
                case "full_hp" -> stats.getHp();
                default -> 0;
            };
        }

        private int countAtLeast(long count) {
            return count > 0 ? 1 : 0;
        }

        private int countProductiveDays() {
            return (int) plans.stream()
                    .filter(plan -> plan.isClosed() && plan.getDayQuality().continuesStreak())
                    .count();
        }

        private int countDaysByQuality(Set<DayQuality> qualities) {
            return (int) plans.stream()
                    .filter(DailyPlan::isClosed)
                    .filter(plan -> qualities.contains(plan.getDayQuality()))
                    .count();
        }

        private int completedItemCount(ActivitySourceType sourceType) {
            return (int) completedItems(sourceType).count();
        }

        private int uniqueCompletedSourceCount(ActivitySourceType sourceType, boolean includeManualNulls) {
            Set<String> keys = completedItems(sourceType)
                    .map(item -> item.getSourceId() == null
                            ? includeManualNulls ? "item:" + item.getId() : null
                            : "source:" + item.getSourceId())
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            return keys.size();
        }

        private java.util.stream.Stream<DailyPlanItem> completedItems(ActivitySourceType sourceType) {
            return planItems.stream()
                    .filter(item -> item.getSourceType() == sourceType)
                    .filter(item -> item.getStatus() == DailyPlanItemStatus.COMPLETED);
        }

        private int maxHabitStreak() {
            Map<Long, List<LocalDate>> datesByHabit = planItems.stream()
                    .filter(item -> item.getSourceType() == ActivitySourceType.HABIT)
                    .filter(item -> item.getStatus() == DailyPlanItemStatus.COMPLETED)
                    .filter(item -> item.getSourceId() != null)
                    .collect(Collectors.groupingBy(
                            DailyPlanItem::getSourceId,
                            Collectors.mapping(item -> item.getDailyPlan().getPlanDate(), Collectors.toList())
                    ));

            int best = 0;
            for (List<LocalDate> dates : datesByHabit.values()) {
                List<LocalDate> sorted = dates.stream().distinct().sorted().toList();
                int current = 0;
                LocalDate previous = null;
                for (LocalDate date : sorted) {
                    current = previous != null && date.equals(previous.plusDays(1)) ? current + 1 : 1;
                    best = Math.max(best, current);
                    previous = date;
                }
            }
            return best;
        }

        private boolean hasEarlyFinishFocus() {
            return focusSessions.stream()
                    .anyMatch(session -> session.getCreditedMode() == FocusCreditedMode.ACTUAL
                            && session.getCreditedDurationSeconds() < session.getPlannedDurationSeconds()
                            && session.getSourceType() != null);
        }

        private boolean hasShieldBeenUsed() {
            return activityLogs.stream()
                    .anyMatch(log -> log.getAction() == ActivityAction.DAY_CLOSED
                            && !log.isStreakShieldAfter()
                            && log.getStreakAfter() > 0
                            && log.getXpDelta() == 0
                            && log.getHpDelta() == 0);
        }
    }
}
