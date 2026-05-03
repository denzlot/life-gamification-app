package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.dailyplan.CreateManualDailyPlanItemRequest;
import com.dcorp.flowvisior.dto.dailyplan.DailyPlanResponse;
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
public class DailyPlanService {

    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final HabitRepository habitRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public DailyPlanService(
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            HabitRepository habitRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.habitRepository = habitRepository;
        this.authenticatedUserService = authenticatedUserService;
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

        if (dailyPlanRepository.existsByUserAndPlanDate(user, today)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Daily plan already exists");
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
                        0,
                        0,
                        0
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
}