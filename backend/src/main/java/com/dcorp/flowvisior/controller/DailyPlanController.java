package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.dailyplan.CreateManualDailyPlanItemRequest;
import com.dcorp.flowvisior.dto.dailyplan.DailyPlanResponse;
import com.dcorp.flowvisior.dto.dailyplan.UpdateDailyPlanNoteRequest;
import com.dcorp.flowvisior.service.DailyPlanService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/daily-plans")
public class DailyPlanController {

    private final DailyPlanService dailyPlanService;

    public DailyPlanController(DailyPlanService dailyPlanService) {
        this.dailyPlanService = dailyPlanService;
    }

    @GetMapping("/today")
    public DailyPlanResponse getTodayPlan() {
        return dailyPlanService.getTodayPlan();
    }

    @PostMapping("/today/start")
    @ResponseStatus(HttpStatus.CREATED)
    public DailyPlanResponse startTodayPlan() {
        return dailyPlanService.startTodayPlan();
    }

    @PostMapping("/today/close")
    public DailyPlanResponse closeTodayPlan() {
        return dailyPlanService.closeTodayPlan();
    }

    @GetMapping("/date/{date}")
    public DailyPlanResponse getPlanByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return dailyPlanService.getPlan(date);
    }

    @PostMapping("/date/{date}/start")
    @ResponseStatus(HttpStatus.CREATED)
    public DailyPlanResponse startPlanByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return dailyPlanService.startPlan(date);
    }

    @PostMapping("/date/{date}/close")
    public DailyPlanResponse closePlanByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return dailyPlanService.closePlan(date, false);
    }

    @PatchMapping("/date/{date}/note")
    public DailyPlanResponse updatePlanNoteByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody UpdateDailyPlanNoteRequest request
    ) {
        return dailyPlanService.updatePlanNote(date, request);
    }

    @PostMapping("/{planId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public DailyPlanResponse addManualItem(
            @PathVariable Long planId,
            @Valid @RequestBody CreateManualDailyPlanItemRequest request
    ) {
        return dailyPlanService.addManualItem(planId, request);
    }
}
