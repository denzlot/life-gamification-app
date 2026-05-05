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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class DailyPlanService {

    private static final LocalTime AUTO_CLOSE_TIME = LocalTime.of(3, 0);

    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final HabitRepository habitRepository;
    private final TaskRepository taskRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final GameService gameService;
    private final UserGameStatsRepository userGameStatsRepository;
    private final ActivityLogRepository activityLogRepository;
    private final QuestStepRepository questStepRepository;
    private final AchievementService achievementService;

    public DailyPlanService(
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            HabitRepository habitRepository,
            TaskRepository taskRepository,
            AuthenticatedUserService authenticatedUserService,
            GameService gameService,
            UserGameStatsRepository userGameStatsRepository,
            ActivityLogRepository activityLogRepository,
            QuestStepRepository questStepRepository,
            AchievementService achievementService
    ) {
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.habitRepository = habitRepository;
        this.taskRepository = taskRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.gameService = gameService;
        this.userGameStatsRepository = userGameStatsRepository;
        this.activityLogRepository = activityLogRepository;
        this.questStepRepository = questStepRepository;
        this.achievementService = achievementService;
    }

    @Transactional
    public DailyPlanResponse getTodayPlan() {
        return getPlan(LocalDate.now());
    }

    @Transactional
    public DailyPlanResponse getPlan(LocalDate planDate) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not started"));

        syncPlannedItems(dailyPlan, user, planDate);
        return responseFor(dailyPlan);
    }

    @Transactional
    public DailyPlanResponse startTodayPlan() {
        return startPlan(LocalDate.now());
    }

    @Transactional
    public DailyPlanResponse startPlan(LocalDate planDate) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseGet(() -> {
                    DailyPlan next = new DailyPlan(user, planDate, DailyPlanStatus.ACTIVE);
                    next.start();
                    return dailyPlanRepository.save(next);
                });

        if (dailyPlan.isClosed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed daily plan must be reopened before editing");
        }

        syncPlannedItems(dailyPlan, user, planDate);
        return responseFor(dailyPlan);
    }

    @Transactional
    public DailyPlanResponse addManualItem(Long planId, CreateManualDailyPlanItemRequest request) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

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
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                0,
                0,
                0
        );

        dailyPlanItemRepository.save(item);
        return responseFor(dailyPlan);
    }

    @Transactional
    public DailyPlanResponse closeTodayPlan() {
        return closePlan(LocalDate.now(), false);
    }

    @Transactional
    public DailyPlanResponse closePlan(LocalDate planDate, boolean automatic) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found"));

        if (dailyPlan.getPlanDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Future daily plans can be prepared, but not closed");
        }

        if (dailyPlan.isClosed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Daily plan is already closed");
        }

        return closePlanInternal(user, dailyPlan, automatic);
    }

    @Transactional
    public DailyPlanResponse reopenPlan(LocalDate planDate) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found"));

        if (!dailyPlan.isClosed()) {
            return responseFor(dailyPlan);
        }

        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Closed daily plan cannot be reopened because game stats were already applied"
        );
    }

    @Transactional
    public void autoCloseOverduePlans(User user) {
        List<DailyPlan> activePlans = dailyPlanRepository
                .findByUserAndStatusAndPlanDateLessThanEqualOrderByPlanDateAsc(
                        user,
                        DailyPlanStatus.ACTIVE,
                        LocalDate.now()
                );

        for (DailyPlan plan : activePlans) {
            if (isAfterAutoCloseTime(plan.getPlanDate())) {
                closePlanInternal(user, plan, true);
            }
        }
    }

    private DailyPlanResponse closePlanInternal(User user, DailyPlan dailyPlan, boolean automatic) {
        syncPlannedItems(dailyPlan, user, dailyPlan.getPlanDate());

        List<DailyPlanItem> items = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);

        long completedCount = items.stream()
                .filter(i -> i.getStatus() == DailyPlanItemStatus.COMPLETED)
                .count();

        long failedCount = items.stream()
                .filter(i -> i.getStatus() == DailyPlanItemStatus.FAILED)
                .count();

        boolean dayWasProductive = completedCount > 0;

        UserGameStats stats = userGameStatsRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Game stats not found"));

        GameService.DayGameDelta delta = gameService.applyDayClose(stats, dayWasProductive, dailyPlan.getPlanDate());
        userGameStatsRepository.save(stats);
        achievementService.checkAndGrant(user);

        activityLogRepository.save(new ActivityLog(
                user, dailyPlan, null,
                ActivityAction.DAY_CLOSED,
                delta.getXpDelta(), delta.getHpDelta(),
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));

        dailyPlan.close(
                (int) completedCount,
                (int) failedCount,
                delta.getXpDelta(),
                delta.getHpDelta(),
                stats.getStreak(),
                delta.isShieldUsed()
        );

        dailyPlanRepository.save(dailyPlan);

        return new ClosedDailyPlanResponse(
                dailyPlan,
                items,
                (int) completedCount,
                (int) failedCount,
                delta.getXpDelta(),
                delta.getHpDelta(),
                stats.getStreak(),
                delta.isShieldUsed(),
                automatic
        );
    }

    private void syncPlannedItems(DailyPlan dailyPlan, User user, LocalDate planDate) {
        if (dailyPlan.isClosed()) {
            return;
        }

        addActiveHabits(dailyPlan, user, planDate);
        addPlannedTasks(dailyPlan, user, planDate);
        addDueQuestSteps(dailyPlan, user, planDate);
    }

    private void addActiveHabits(DailyPlan dailyPlan, User user, LocalDate planDate) {
        habitRepository.findByUserAndActiveTrueOrderByCreatedAtDesc(user)
                .stream()
                .filter(habit -> habit.worksOn(planDate))
                .forEach(habit -> {
                    boolean exists = dailyPlanItemRepository.existsByDailyPlanAndSourceTypeAndSourceId(
                            dailyPlan,
                            ActivitySourceType.HABIT,
                            habit.getId()
                    );
                    if (!exists) {
                        dailyPlanItemRepository.save(new DailyPlanItem(
                                dailyPlan,
                                ActivitySourceType.HABIT,
                                habit.getId(),
                                habit.getTitle(),
                                habit.getDescription(),
                                habit.getPlannedTime(),
                                habit.getDeadlineTime(),
                                0,
                                0,
                                0
                        ));
                    }
                });
    }

    private void addPlannedTasks(DailyPlan dailyPlan, User user, LocalDate planDate) {
        taskRepository.findByUserAndStatusAndDeadlineDateOrderByPlannedTimeAscCreatedAtAsc(user, TaskStatus.TODO, planDate)
                .forEach(task -> {
                    boolean exists = dailyPlanItemRepository.existsByDailyPlanAndSourceTypeAndSourceId(
                            dailyPlan,
                            ActivitySourceType.TASK,
                            task.getId()
                    );
                    if (!exists) {
                        dailyPlanItemRepository.save(new DailyPlanItem(
                                dailyPlan,
                                ActivitySourceType.TASK,
                                task.getId(),
                                task.getTitle(),
                                task.getDescription(),
                                task.getPlannedTime(),
                                task.getDeadlineTime(),
                                0,
                                0,
                                0
                        ));
                    }
                });
    }

    private void addDueQuestSteps(DailyPlan dailyPlan, User user, LocalDate planDate) {
        List<QuestStep> dueQuestSteps = questStepRepository
                .findByQuest_UserAndQuest_StatusAndStatusAndScheduledDateOrderByStepNumberAsc(
                        user,
                        QuestStatus.ACTIVE,
                        QuestStepStatus.PENDING,
                        planDate
                );

        dueQuestSteps.stream()
                .filter(step -> !dailyPlanItemRepository.existsByDailyPlanAndSourceTypeAndSourceId(
                        dailyPlan,
                        ActivitySourceType.QUEST,
                        step.getId()
                ))
                .map(step -> new DailyPlanItem(
                        dailyPlan,
                        ActivitySourceType.QUEST,
                        step.getId(),
                        step.getTitle(),
                        step.getDescription(),
                        step.getPlannedTime(),
                        step.getDeadlineTime(),
                        0,
                        0,
                        0
                ))
                .forEach(dailyPlanItemRepository::save);
    }

    private boolean isAfterAutoCloseTime(LocalDate planDate) {
        LocalDateTime cutoff = planDate.plusDays(1).atTime(AUTO_CLOSE_TIME);
        return !LocalDateTime.now().isBefore(cutoff);
    }

    private DailyPlanResponse responseFor(DailyPlan dailyPlan) {
        autoFailExpiredDeadlines(dailyPlan);
        List<DailyPlanItem> items = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);
        return new DailyPlanResponse(dailyPlan, items);
    }

    private void autoFailExpiredDeadlines(DailyPlan dailyPlan) {
        if (dailyPlan.isClosed() || dailyPlan.getPlanDate().isAfter(LocalDate.now())) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<DailyPlanItem> expired = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan)
                .stream()
                .filter(item -> item.isDeadlineExpired(now))
                .toList();

        expired.forEach(DailyPlanItem::fail);
        if (!expired.isEmpty()) {
            dailyPlanItemRepository.saveAll(expired);
        }
    }

    private static final class ClosedDailyPlanResponse extends DailyPlanResponse {
        private final int completedCount;
        private final int failedCount;
        private final int xpEarned;
        private final int hpDelta;
        private final int streakAfterClose;
        private final boolean shieldUsed;
        private final boolean automatic;

        private ClosedDailyPlanResponse(
                DailyPlan dailyPlan,
                List<DailyPlanItem> items,
                int completedCount,
                int failedCount,
                int xpEarned,
                int hpDelta,
                int streakAfterClose,
                boolean shieldUsed,
                boolean automatic
        ) {
            super(dailyPlan, items);
            this.completedCount = completedCount;
            this.failedCount = failedCount;
            this.xpEarned = xpEarned;
            this.hpDelta = hpDelta;
            this.streakAfterClose = streakAfterClose;
            this.shieldUsed = shieldUsed;
            this.automatic = automatic;
        }

        public int getCompletedCount() { return completedCount; }
        public int getFailedCount() { return failedCount; }
        public int getXpEarned() { return xpEarned; }
        public int getHpDelta() { return hpDelta; }
        public int getStreakAfterClose() { return streakAfterClose; }
        public boolean isShieldUsed() { return shieldUsed; }
        public boolean isAutomatic() { return automatic; }
    }
}
