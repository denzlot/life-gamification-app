package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.dailyplan.CreateManualDailyPlanItemRequest;
import com.dcorp.flowvisior.dto.dailyplan.DailyPlanResponse;
import com.dcorp.flowvisior.dto.dailyplan.UpdateDailyPlanNoteRequest;
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
import java.util.Objects;

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
        DailyPlan dailyPlan = getExistingPlanForUser(user, planDate);
        return responseFor(dailyPlan);
    }

    @Transactional
    public DailyPlan getExistingPlanForUser(User user, LocalDate planDate) {
        autoCloseOverduePlans(user);

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not started"));

        syncPlannedItems(dailyPlan, user, planDate);
        return dailyPlan;
    }

    @Transactional
    public DailyPlan getOrPreparePlanForUser(User user, LocalDate planDate) {
        autoCloseOverduePlans(user);

        if (planDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found");
        }

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseGet(() -> dailyPlanRepository.save(new DailyPlan(user, planDate, DailyPlanStatus.PLANNED)));

        syncPlannedItems(dailyPlan, user, planDate);
        autoFailExpiredDeadlines(dailyPlan);
        return dailyPlan;
    }

    @Transactional
    public List<DailyPlanItem> getItemsForUserPlan(User user, LocalDate planDate) {
        DailyPlan dailyPlan = getOrPreparePlanForUser(user, planDate);
        return dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);
    }

    @Transactional
    public DailyPlanItemStatus cycleItemStatusFromTelegram(User user, DailyPlanItem item, LocalDate allowedDate) {
        if (!Objects.equals(item.getDailyPlan().getUser().getId(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
        }

        if (!item.getDailyPlan().getPlanDate().equals(allowedDate)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This action is no longer available");
        }

        if (item.getSourceType() == ActivitySourceType.MANUAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This action is not allowed");
        }

        return switch (item.getStatus()) {
            case PENDING -> {
                gameService.complete(item, user);
                yield DailyPlanItemStatus.COMPLETED;
            }
            case COMPLETED -> {
                gameService.fail(item, user);
                yield DailyPlanItemStatus.FAILED;
            }
            case FAILED -> {
                gameService.reset(item, user);
                yield DailyPlanItemStatus.PENDING;
            }
        };
    }

    @Transactional
    public DailyPlanResponse startTodayPlan() {
        return startPlan(LocalDate.now());
    }

    @Transactional
    public DailyPlanResponse startPlan(LocalDate planDate) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

        if (planDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Past daily plans are read-only");
        }

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseGet(() -> {
                    DailyPlan next = new DailyPlan(user, planDate, DailyPlanStatus.ACTIVE);
                    next.start();
                    return dailyPlanRepository.save(next);
                });

        if (dailyPlan.isClosed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed daily plan cannot be edited");
        }

        if (dailyPlan.getStatus() != DailyPlanStatus.ACTIVE) {
            dailyPlan.start();
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

        if (!Objects.equals(dailyPlan.getUser().getId(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found");
        }

        if (dailyPlan.isClosed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed daily plan cannot be edited");
        }

        if (dailyPlan.getPlanDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Past daily plans are read-only");
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
    public DailyPlanResponse updatePlanNote(LocalDate planDate, UpdateDailyPlanNoteRequest request) {
        User user = authenticatedUserService.getCurrentUser();
        autoCloseOverduePlans(user);

        DailyPlan dailyPlan = dailyPlanRepository.findByUserAndPlanDate(user, planDate)
                .orElseGet(() -> {
                    if (planDate.isBefore(LocalDate.now())) {
                        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Daily plan not found");
                    }
                    DailyPlan next = new DailyPlan(user, planDate, DailyPlanStatus.PLANNED);
                    return dailyPlanRepository.save(next);
                });

        dailyPlan.updateNote(normalizeNote(request.getNote()));
        dailyPlanRepository.save(dailyPlan);

        if (!dailyPlan.isClosed()) {
            syncPlannedItems(dailyPlan, user, planDate);
        }

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

        List<DailyPlan> stalePlannedPlans = dailyPlanRepository
                .findByUserAndStatusAndPlanDateLessThanEqualOrderByPlanDateAsc(
                        user,
                        DailyPlanStatus.PLANNED,
                        LocalDate.now().minusDays(1)
                );

        for (DailyPlan plan : stalePlannedPlans) {
            closePlanInternal(user, plan, true);
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

        int totalCount = items.size();
        double completionRate = totalCount == 0 ? 0d : (double) completedCount / totalCount;
        DayQuality dayQuality = DayQuality.fromCounts((int) completedCount, totalCount);

        UserGameStats stats = userGameStatsRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Game stats not found"));

        GameService.DayGameDelta delta = gameService.applyDayClose(stats, dayQuality, dailyPlan.getPlanDate(), totalCount);
        userGameStatsRepository.save(stats);

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
                totalCount,
                completionRate,
                dayQuality,
                delta.getXpDelta(),
                delta.getHpDelta(),
                stats.getStreak(),
                delta.isShieldUsed()
        );

        dailyPlanRepository.save(dailyPlan);
        achievementService.checkAndGrant(user);

        return new ClosedDailyPlanResponse(
                dailyPlan,
                items,
                (int) completedCount,
                (int) failedCount,
                totalCount,
                completionRate,
                dayQuality,
                delta.getXpDelta(),
                delta.getHpDelta(),
                stats.getStreak(),
                delta.isShieldUsed(),
                automatic
        );
    }

    private void syncPlannedItems(DailyPlan dailyPlan, User user, LocalDate planDate) {
        if (dailyPlan.isClosed() || planDate.isBefore(LocalDate.now())) {
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
        LocalDate today = LocalDate.now();
        if (planDate.isBefore(today)) {
            return true;
        }
        if (planDate.isAfter(today)) {
            return false;
        }
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

    private String normalizeNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static final class ClosedDailyPlanResponse extends DailyPlanResponse {
        private final int completedCount;
        private final int failedCount;
        private final int totalCount;
        private final double completionRate;
        private final DayQuality dayQuality;
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
                int totalCount,
                double completionRate,
                DayQuality dayQuality,
                int xpEarned,
                int hpDelta,
                int streakAfterClose,
                boolean shieldUsed,
                boolean automatic
        ) {
            super(dailyPlan, items);
            this.completedCount = completedCount;
            this.failedCount = failedCount;
            this.totalCount = totalCount;
            this.completionRate = completionRate;
            this.dayQuality = dayQuality;
            this.xpEarned = xpEarned;
            this.hpDelta = hpDelta;
            this.streakAfterClose = streakAfterClose;
            this.shieldUsed = shieldUsed;
            this.automatic = automatic;
        }

        public int getCompletedCount() { return completedCount; }
        public int getFailedCount() { return failedCount; }
        public int getTotalCount() { return totalCount; }
        public double getCompletionRate() { return completionRate; }
        public DayQuality getDayQuality() { return dayQuality; }
        public int getXpEarned() { return xpEarned; }
        public int getHpDelta() { return hpDelta; }
        public int getStreakAfterClose() { return streakAfterClose; }
        public boolean isShieldUsed() { return shieldUsed; }
        public boolean isAutomatic() { return automatic; }
    }
}
