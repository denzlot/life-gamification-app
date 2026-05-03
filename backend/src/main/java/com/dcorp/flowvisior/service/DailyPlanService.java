package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.dailyplan.CreateManualDailyPlanItemRequest;
import com.dcorp.flowvisior.dto.dailyplan.DailyPlanResponse;
import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class DailyPlanService {

    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final HabitRepository habitRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final GameService gameService;
    private final UserGameStatsRepository userGameStatsRepository;
    private final ActivityLogRepository activityLogRepository;

    public DailyPlanService(
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            HabitRepository habitRepository,
            AuthenticatedUserService authenticatedUserService,
            GameService gameService,
            UserGameStatsRepository userGameStatsRepository, ActivityLogRepository activityLogRepository
    ) {
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.habitRepository = habitRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.gameService = gameService;
        this.userGameStatsRepository = userGameStatsRepository;
        this.activityLogRepository = activityLogRepository;
    }

    public DailyPlanResponse getTodayPlan() {
        User user = authenticatedUserService.getCurrentUser();
        LocalDate today = LocalDate.now();

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, today)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not started"));

        List<DailyPlanItem> items = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);

        return new DailyPlanResponse(dailyPlan, items);
    }

    @Transactional
    public DailyPlanResponse startTodayPlan() {
        User user = authenticatedUserService.getCurrentUser();
        LocalDate today = LocalDate.now();

        var existingPlan = dailyPlanRepository.findByUserAndPlanDate(user, today);

        if (existingPlan.isPresent()) {
            DailyPlan dailyPlan = existingPlan.get();

            if (dailyPlan.isClosed()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed daily plan cannot be restarted");
            }

            List<DailyPlanItem> items = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);
            return new DailyPlanResponse(dailyPlan, items);
        }

        DailyPlan dailyPlan = new DailyPlan(user, today, DailyPlanStatus.ACTIVE);
        dailyPlan.start();

        DailyPlan savedPlan = dailyPlanRepository.save(dailyPlan);

        List<Habit> activeHabits = habitRepository.findByUserAndActiveTrueOrderByCreatedAtDesc(user);

        List<DailyPlanItem> items = activeHabits.stream()
                .map(habit -> new DailyPlanItem(
                        savedPlan,
                        ActivitySourceType.HABIT,
                        habit.getId(),
                        habit.getTitle(),
                        xpRewardFor(habit.getDifficulty()),
                        hpCompleteFor(habit.getDifficulty()),
                        hpFailFor(habit.getDifficulty())
                ))
                .map(dailyPlanItemRepository::save)
                .toList();

        return new DailyPlanResponse(savedPlan, items);
    }

    @Transactional
    public DailyPlanResponse addManualItem(Long planId, CreateManualDailyPlanItemRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        DailyPlan dailyPlan = dailyPlanRepository.findById(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found"));

        if (!dailyPlan.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found");
        }

        if (dailyPlan.isClosed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed daily plan cannot be edited");
        }

        DailyPlanItem item = new DailyPlanItem(
                dailyPlan,
                ActivitySourceType.MANUAL,
                null,
                request.getTitle(),
                0,
                0,
                0
        );

        dailyPlanItemRepository.save(item);

        List<DailyPlanItem> items = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);

        return new DailyPlanResponse(dailyPlan, items);
    }

    @Transactional
    public DailyPlanResponse closeTodayPlan() {
        User user = authenticatedUserService.getCurrentUser();
        LocalDate today = LocalDate.now();

        // 1. Находим план на сегодня
        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, today)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Daily plan not found"
                ));

        // 2. Проверяем что план активен
        if (dailyPlan.isClosed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Daily plan is already closed"
            );
        }

        // 3. Считаем items
        List<DailyPlanItem> items =
                dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);

        long completedCount = items.stream()
                .filter(i -> i.getStatus() == DailyPlanItemStatus.COMPLETED)
                .count();

        long failedCount = items.stream()
                .filter(i -> i.getStatus() == DailyPlanItemStatus.FAILED)
                .count();

        // 4. Определяем был ли день продуктивным
        boolean dayWasProductive = completedCount > 0;

        // 5. Считаем XP и HP за день из ActivityLog
        List<ActivityLog> dayLogs = activityLogRepository
                .findByDailyPlanOrderByCreatedAtAsc(dailyPlan);

        int xpEarned = dayLogs.stream()
                .mapToInt(ActivityLog::getXpDelta)
                .sum();

        int hpDelta = dayLogs.stream()
                .mapToInt(ActivityLog::getHpDelta)
                .sum();

        // 6. Загружаем игровую статистику
        UserGameStats stats = userGameStatsRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Game stats not found"
                ));

        // 7. Запоминаем был ли щит до применения логики
        boolean shieldBefore = stats.isStreakShield();

        // 8. Применяем логику стрика
        gameService.applyStreakLogic(stats, dayWasProductive);

        // 9. Штраф HP если день непродуктивный
        if (!dayWasProductive) {
            int hpBefore = stats.getHp();
            stats.addHp(-8);
            hpDelta += stats.getHp() - hpBefore;
        }

        // 10. Определяем сработал ли щит
        boolean shieldUsed = shieldBefore && !stats.isStreakShield();

        // 11. Сохраняем игровую статистику
        userGameStatsRepository.save(stats);

        // 12. Записываем DAY_CLOSED в ActivityLog
        activityLogRepository.save(new ActivityLog(
                user, dailyPlan, null,
                ActivityAction.DAY_CLOSED,
                0, hpDelta,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));

        // 13. Закрываем план с итогами
        dailyPlan.close(
                (int) completedCount,
                (int) failedCount,
                xpEarned,
                hpDelta,
                stats.getStreak(),
                shieldUsed
        );

        dailyPlanRepository.save(dailyPlan);

        return new DailyPlanResponse(dailyPlan, items);
    }

    private int xpRewardFor(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 10;
            case MEDIUM -> 25;
            case HARD -> 50;
        };
    }

    private int hpCompleteFor(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 1;
            case MEDIUM -> 3;
            case HARD -> 5;
        };
    }

    private int hpFailFor(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> -2;
            case MEDIUM -> -5;
            case HARD -> -10;
        };
    }
}
