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

    public HabitService(
            HabitRepository habitRepository,
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.habitRepository = habitRepository;
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.authenticatedUserService = authenticatedUserService;
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

        Habit habit = new Habit(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                request.getScheduleDays()
        );

        Habit savedHabit = habitRepository.save(habit);
        addHabitToOpenPlans(savedHabit, user);

        return new HabitResponse(savedHabit);
    }

    @Transactional
    public HabitResponse updateHabit(Long id, UpdateHabitRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habit.update(
                request.getTitle(),
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                request.getScheduleDays()
        );
        if (habit.isActive()) {
            addHabitToOpenPlans(habit, user);
        }

        return new HabitResponse(habit);
    }

    @Transactional
    public HabitResponse toggleActive(Long id) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habit.toggleActive();

        if (habit.isActive()) {
            addHabitToOpenPlans(habit, user);
        }

        return new HabitResponse(habit);
    }

    @Transactional
    public void deleteHabit(Long id) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habitRepository.delete(habit);
    }

    private void addHabitToOpenPlans(Habit habit, User user) {
        List<DailyPlan> openPlans = dailyPlanRepository
                .findByUserAndStatusAndPlanDateGreaterThanEqualOrderByPlanDateAsc(
                        user,
                        DailyPlanStatus.ACTIVE,
                        LocalDate.now()
                );

        for (DailyPlan plan : openPlans) {
            if (habit.worksOn(plan.getPlanDate())) {
                addHabitToPlanIfMissing(plan, habit);
            }
        }
    }

    private void addHabitToPlanIfMissing(DailyPlan plan, Habit habit) {
        boolean exists = dailyPlanItemRepository.existsByDailyPlanAndSourceTypeAndSourceId(
                plan,
                ActivitySourceType.HABIT,
                habit.getId()
        );

        if (!exists) {
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
        }
    }
}
