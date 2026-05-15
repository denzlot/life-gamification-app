package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.habit.CreateHabitRequest;
import com.dcorp.flowvisior.dto.habit.HabitResponse;
import com.dcorp.flowvisior.dto.habit.UpdateHabitRequest;
import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.DailyPlanRepository;
import com.dcorp.flowvisior.repository.HabitRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final AchievementService achievementService;

    public HabitService(
            HabitRepository habitRepository,
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            AuthenticatedUserService authenticatedUserService,
            AchievementService achievementService
    ) {
        this.habitRepository = habitRepository;
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.achievementService = achievementService;
    }

    public List<HabitResponse> getHabits() {
        User user = authenticatedUserService.getCurrentUser();

        return habitRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(HabitResponse::new)
                .toList();
    }

    @Transactional
    public HabitResponse createHabit(CreateHabitRequest request) {
        User user = authenticatedUserService.getCurrentUser();
        validateSchedule(request.getScheduleType(), request.getMonthlyDay(), request.getIntervalDays(), request.getIntervalStartDate());

        Habit habit = new Habit(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                request.getScheduleType(),
                request.getScheduleDays(),
                request.getMonthlyDay(),
                request.getIntervalDays(),
                request.getIntervalStartDate()
        );

        Habit savedHabit = habitRepository.save(habit);
        syncHabitWithOpenPlans(savedHabit, user);
        achievementService.checkAndGrant(user);

        return new HabitResponse(savedHabit);
    }

    @Transactional
    public HabitResponse updateHabit(Long id, UpdateHabitRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        validateSchedule(request.getScheduleType(), request.getMonthlyDay(), request.getIntervalDays(), request.getIntervalStartDate());
        habit.update(
                request.getTitle(),
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                request.getScheduleType(),
                request.getScheduleDays(),
                request.getMonthlyDay(),
                request.getIntervalDays(),
                request.getIntervalStartDate()
        );
        syncHabitWithOpenPlans(habit, user);

        return new HabitResponse(habit);
    }

    @Transactional
    public HabitResponse toggleActive(Long id) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habit.toggleActive();

        syncHabitWithOpenPlans(habit, user);

        return new HabitResponse(habit);
    }

    @Transactional
    public void deleteHabit(Long id) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habitRepository.delete(habit);
    }

    private void syncHabitWithOpenPlans(Habit habit, User user) {
        List<DailyPlan> openPlans = dailyPlanRepository
                .findByUserAndStatusInAndPlanDateGreaterThanEqualOrderByPlanDateAsc(
                        user,
                        List.of(DailyPlanStatus.ACTIVE, DailyPlanStatus.PLANNED),
                        LocalDate.now()
                );

        for (DailyPlan plan : openPlans) {
            syncHabitWithPlan(plan, habit);
        }
    }

    private void syncHabitWithPlan(DailyPlan plan, Habit habit) {
        DailyPlanItem existing = dailyPlanItemRepository
                .findByDailyPlanAndSourceTypeAndSourceId(plan, ActivitySourceType.HABIT, habit.getId())
                .orElse(null);

        boolean shouldExist = habit.isActive() && habit.worksOn(plan.getPlanDate());
        if (shouldExist && existing == null) {
            dailyPlanItemRepository.save(new DailyPlanItem(
                    plan,
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
            return;
        }

        if (existing == null || existing.getStatus() != DailyPlanItemStatus.PENDING) {
            return;
        }

        if (shouldExist) {
            existing.update(habit.getTitle(), habit.getDescription(), habit.getPlannedTime(), habit.getDeadlineTime());
            dailyPlanItemRepository.save(existing);
        } else {
            dailyPlanItemRepository.delete(existing);
        }
    }

    private void validateSchedule(
            HabitScheduleType scheduleType,
            Integer monthlyDay,
            Integer intervalDays,
            LocalDate intervalStartDate
    ) {
        HabitScheduleType normalizedType = scheduleType == null ? HabitScheduleType.WEEKLY : scheduleType;
        if (normalizedType == HabitScheduleType.MONTHLY && (monthlyDay == null || monthlyDay < 1 || monthlyDay > 31)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "monthlyDay is required for monthly habits");
        }
        if (normalizedType == HabitScheduleType.INTERVAL
                && (intervalDays == null || intervalDays < 1 || intervalDays > 3650 || intervalStartDate == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "intervalDays and intervalStartDate are required for interval habits");
        }
    }
}
