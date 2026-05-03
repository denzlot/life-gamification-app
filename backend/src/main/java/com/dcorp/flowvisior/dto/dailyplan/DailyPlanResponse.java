package com.dcorp.flowvisior.dto.dailyplan;

import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class DailyPlanResponse {

    private final Long id;
    private final LocalDate planDate;
    private final DailyPlanStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime startedAt;
    private final LocalDateTime closedAt;
    private final List<DailyPlanItemResponse> items;

    public DailyPlanResponse(DailyPlan dailyPlan, List<DailyPlanItem> items) {
        this.id = dailyPlan.getId();
        this.planDate = dailyPlan.getPlanDate();
        this.status = dailyPlan.getStatus();
        this.createdAt = dailyPlan.getCreatedAt();
        this.startedAt = dailyPlan.getStartedAt();
        this.closedAt = dailyPlan.getClosedAt();
        this.items = items.stream()
                .map(DailyPlanItemResponse::new)
                .toList();
    }

    public Long getId() { return id; }
    public LocalDate getPlanDate() { return planDate; }
    public DailyPlanStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public List<DailyPlanItemResponse> getItems() { return items; }
}