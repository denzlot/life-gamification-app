package com.dcorp.flowvisior.dto.dailyplan;

import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanStatus;
import com.dcorp.flowvisior.entity.DayQuality;

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
    private final String note;
    private final DayQuality dayQuality;
    private final int completedCount;
    private final int failedCount;
    private final int totalCountAtClose;
    private final double completionRateAtClose;
    private final int xpEarned;
    private final int hpDelta;
    private final int streakAfterClose;
    private final boolean shieldUsed;
    private final List<DailyPlanItemResponse> items;

    public DailyPlanResponse(DailyPlan dailyPlan, List<DailyPlanItem> items) {
        this.id = dailyPlan.getId();
        this.planDate = dailyPlan.getPlanDate();
        this.status = dailyPlan.getStatus();
        this.createdAt = dailyPlan.getCreatedAt();
        this.startedAt = dailyPlan.getStartedAt();
        this.closedAt = dailyPlan.getClosedAt();
        this.note = dailyPlan.getNote();
        this.dayQuality = dailyPlan.getDayQuality();
        this.completedCount = dailyPlan.getCompletedCount();
        this.failedCount = dailyPlan.getFailedCount();
        this.totalCountAtClose = dailyPlan.getTotalCountAtClose();
        this.completionRateAtClose = dailyPlan.getCompletionRateAtClose();
        this.xpEarned = dailyPlan.getXpEarned();
        this.hpDelta = dailyPlan.getHpDelta();
        this.streakAfterClose = dailyPlan.getStreakAfterClose();
        this.shieldUsed = dailyPlan.isShieldUsed();
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
    public String getNote() { return note; }
    public DayQuality getDayQuality() { return dayQuality; }
    public int getCompletedCount() { return completedCount; }
    public int getFailedCount() { return failedCount; }
    public int getTotalCountAtClose() { return totalCountAtClose; }
    public double getCompletionRateAtClose() { return completionRateAtClose; }
    public int getXpEarned() { return xpEarned; }
    public int getHpDelta() { return hpDelta; }
    public int getStreakAfterClose() { return streakAfterClose; }
    public boolean isShieldUsed() { return shieldUsed; }
    public List<DailyPlanItemResponse> getItems() { return items; }
}
