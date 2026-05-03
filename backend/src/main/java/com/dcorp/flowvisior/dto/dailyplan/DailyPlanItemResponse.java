package com.dcorp.flowvisior.dto.dailyplan;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanItemStatus;

import java.time.LocalDateTime;

public class DailyPlanItemResponse {

    private final Long id;
    private final ActivitySourceType sourceType;
    private final Long sourceId;
    private final String title;
    private final DailyPlanItemStatus status;
    private final int xpReward;
    private final int hpDeltaComplete;
    private final int hpDeltaFail;
    private final LocalDateTime createdAt;
    private final LocalDateTime completedAt;

    public DailyPlanItemResponse(DailyPlanItem item) {
        this.id = item.getId();
        this.sourceType = item.getSourceType();
        this.sourceId = item.getSourceId();
        this.title = item.getTitle();
        this.status = item.getStatus();
        this.xpReward = item.getXpReward();
        this.hpDeltaComplete = item.getHpDeltaComplete();
        this.hpDeltaFail = item.getHpDeltaFail();
        this.createdAt = item.getCreatedAt();
        this.completedAt = item.getCompletedAt();
    }

    public Long getId() { return id; }
    public ActivitySourceType getSourceType() { return sourceType; }
    public Long getSourceId() { return sourceId; }
    public String getTitle() { return title; }
    public DailyPlanItemStatus getStatus() { return status; }
    public int getXpReward() { return xpReward; }
    public int getHpDeltaComplete() { return hpDeltaComplete; }
    public int getHpDeltaFail() { return hpDeltaFail; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}