package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.dailyplan.CreateManualDailyPlanItemRequest;
import com.dcorp.flowvisior.dto.dailyplan.DailyPlanResponse;
import com.dcorp.flowvisior.service.DailyPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/{planId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public DailyPlanResponse addManualItem(
            @PathVariable Long planId,
            @Valid @RequestBody CreateManualDailyPlanItemRequest request
    ) {
        return dailyPlanService.addManualItem(planId, request);
    }
}