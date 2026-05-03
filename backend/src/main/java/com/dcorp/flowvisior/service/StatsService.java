package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.stats.*;
import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final AuthenticatedUserService authenticatedUserService;
    private final UserGameStatsService userGameStatsService;
    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final ActivityLogRepository activityLogRepository;
    private final QuestRepository questRepository;

    public StatsService(
            AuthenticatedUserService authenticatedUserService,
            UserGameStatsService userGameStatsService,
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            ActivityLogRepository activityLogRepository,
            QuestRepository questRepository
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.userGameStatsService = userGameStatsService;
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.activityLogRepository = activityLogRepository;
        this.questRepository = questRepository;
    }

    @Transactional
    public StatsResponse getStats() {
        User user = authenticatedUserService.getCurrentUser();
        UserGameStats stats = userGameStatsService.getOrCreateFor(user);

        List<DailyPlan> plans = dailyPlanRepository.findByUserOrderByPlanDateAsc(user);
        List<DailyPlanItem> items = plans.isEmpty()
                ? List.of()
                : dailyPlanItemRepository.findByDailyPlanIn(plans);
        List<ActivityLog> logs = activityLogRepository.findByUserOrderByCreatedAtDesc(user);

        List<XpByWeekResponse> xpByWeek = buildXpByWeek(logs);

        return new StatsResponse(
                buildAllTime(user, stats, plans, items, xpByWeek),
                buildThisWeek(plans, items, logs),
                xpByWeek,
                buildStreakHistory(plans)
        );
    }

    private AllTimeStatsResponse buildAllTime(
            User user,
            UserGameStats stats,
            List<DailyPlan> plans,
            List<DailyPlanItem> items,
            List<XpByWeekResponse> xpByWeek
    ) {
        int bestStreak = plans.stream()
                .mapToInt(DailyPlan::getStreakAfterClose)
                .max()
                .orElse(0);
        bestStreak = Math.max(bestStreak, stats.getStreak());

        XpByWeekResponse bestWeek = xpByWeek.stream()
                .max(Comparator.comparingInt(XpByWeekResponse::getXp))
                .orElse(null);

        return new AllTimeStatsResponse(
                bestStreak,
                stats.getXp(),
                countCompletedBySource(items, ActivitySourceType.TASK),
                countCompletedBySource(items, ActivitySourceType.HABIT),
                questRepository.countByUserAndStatus(user, QuestStatus.COMPLETED),
                bestWeek == null ? 0 : bestWeek.getXp(),
                bestWeek == null ? null : bestWeek.getWeekStart()
        );
    }

    private ThisWeekStatsResponse buildThisWeek(
            List<DailyPlan> plans,
            List<DailyPlanItem> items,
            List<ActivityLog> logs
    ) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        int xp = logs.stream()
                .filter(log -> isBetween(log.getCreatedAt().toLocalDate(), weekStart, weekEnd))
                .mapToInt(ActivityLog::getXpDelta)
                .sum();

        int tasksCompleted = countCompletedBySourceInPeriod(
                items,
                ActivitySourceType.TASK,
                weekStart,
                weekEnd
        );
        int habitsCompleted = countCompletedBySourceInPeriod(
                items,
                ActivitySourceType.HABIT,
                weekStart,
                weekEnd
        );
        int activeDays = countActiveDays(plans, items, weekStart, weekEnd);

        return new ThisWeekStatsResponse(xp, tasksCompleted, habitsCompleted, activeDays);
    }

    private List<XpByWeekResponse> buildXpByWeek(List<ActivityLog> logs) {
        Map<LocalDate, Integer> xpByWeek = new TreeMap<>();

        for (ActivityLog log : logs) {
            LocalDate weekStart = log.getCreatedAt().toLocalDate().with(DayOfWeek.MONDAY);
            xpByWeek.merge(weekStart, log.getXpDelta(), Integer::sum);
        }

        return xpByWeek.entrySet()
                .stream()
                .map(entry -> new XpByWeekResponse(entry.getKey(), entry.getValue()))
                .toList();
    }

    private List<StreakHistoryResponse> buildStreakHistory(List<DailyPlan> plans) {
        Map<YearMonth, Integer> maxStreakByMonth = new TreeMap<>();

        for (DailyPlan plan : plans) {
            YearMonth month = YearMonth.from(plan.getPlanDate());
            maxStreakByMonth.merge(month, plan.getStreakAfterClose(), Math::max);
        }

        return maxStreakByMonth.entrySet()
                .stream()
                .map(entry -> new StreakHistoryResponse(
                        entry.getKey().toString(),
                        entry.getValue()
                ))
                .toList();
    }

    private int countCompletedBySource(List<DailyPlanItem> items, ActivitySourceType sourceType) {
        return (int) items.stream()
                .filter(item -> item.getSourceType() == sourceType)
                .filter(item -> item.getStatus() == DailyPlanItemStatus.COMPLETED)
                .count();
    }

    private int countCompletedBySourceInPeriod(
            List<DailyPlanItem> items,
            ActivitySourceType sourceType,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return (int) items.stream()
                .filter(item -> item.getSourceType() == sourceType)
                .filter(item -> item.getStatus() == DailyPlanItemStatus.COMPLETED)
                .filter(item -> item.getCompletedAt() != null)
                .filter(item -> isBetween(item.getCompletedAt().toLocalDate(), startDate, endDate))
                .count();
    }

    private int countActiveDays(
            List<DailyPlan> plans,
            List<DailyPlanItem> items,
            LocalDate startDate,
            LocalDate endDate
    ) {
        Map<Long, Long> completedCountByPlanId = items.stream()
                .filter(item -> item.getStatus() == DailyPlanItemStatus.COMPLETED)
                .collect(Collectors.groupingBy(
                        item -> item.getDailyPlan().getId(),
                        Collectors.counting()
                ));

        return (int) plans.stream()
                .filter(plan -> isBetween(plan.getPlanDate(), startDate, endDate))
                .filter(plan -> completedCountByPlanId.getOrDefault(plan.getId(), 0L) > 0)
                .count();
    }

    private boolean isBetween(LocalDate date, LocalDate startDate, LocalDate endDate) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }
}
