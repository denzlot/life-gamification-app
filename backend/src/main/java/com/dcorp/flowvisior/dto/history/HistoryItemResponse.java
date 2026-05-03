package com.dcorp.flowvisior.dto.history;

import com.dcorp.flowvisior.entity.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class HistoryItemResponse {

    private final Long id;
    private final ActivityAction action;
    private final ActivitySourceType sourceType;
    private final Long sourceId;
    private final String title;
    private final LocalDate planDate;
    private final int xpDelta;
    private final int hpDelta;
    private final int xpAfter;
    private final int hpAfter;
    private final int streakAfter;
    private final boolean streakShieldAfter;
    private final LocalDateTime createdAt;

    public HistoryItemResponse(ActivityLog log) {
        DailyPlan dailyPlan = log.getDailyPlan();
        DailyPlanItem item = log.getDailyPlanItem();

        this.id = log.getId();
        this.action = log.getAction();
        this.sourceType = item == null ? null : item.getSourceType();
        this.sourceId = item == null ? null : item.getSourceId();
        this.title = item == null ? null : item.getTitle();
        this.planDate = dailyPlan == null ? null : dailyPlan.getPlanDate();
        this.xpDelta = log.getXpDelta();
        this.hpDelta = log.getHpDelta();
        this.xpAfter = log.getXpAfter();
        this.hpAfter = log.getHpAfter();
        this.streakAfter = log.getStreakAfter();
        this.streakShieldAfter = log.isStreakShieldAfter();
        this.createdAt = log.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public ActivityAction getAction() {
        return action;
    }

    public ActivitySourceType getSourceType() {
        return sourceType;
    }

    public Long getSourceId() {
        return sourceId;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getPlanDate() {
        return planDate;
    }

    public int getXpDelta() {
        return xpDelta;
    }

    public int getHpDelta() {
        return hpDelta;
    }

    public int getXpAfter() {
        return xpAfter;
    }

    public int getHpAfter() {
        return hpAfter;
    }

    public int getStreakAfter() {
        return streakAfter;
    }

    public boolean isStreakShieldAfter() {
        return streakShieldAfter;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
