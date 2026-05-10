package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "daily_plan_items")
public class DailyPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "daily_plan_id", nullable = false)
    private DailyPlan dailyPlan;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ActivitySourceType sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "planned_time")
    private LocalTime plannedTime;

    @Column(name = "deadline_time")
    private LocalTime deadlineTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DailyPlanItemStatus status;

    @Column(name = "xp_reward", nullable = false)
    private int xpReward;

    @Column(name = "hp_delta_complete", nullable = false)
    private int hpDeltaComplete;

    @Column(name = "hp_delta_fail", nullable = false)
    private int hpDeltaFail;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "focus_spent_seconds")
    private Integer focusSpentSeconds;

    protected DailyPlanItem() {
    }

    public DailyPlanItem(
            DailyPlan dailyPlan,
            ActivitySourceType sourceType,
            Long sourceId,
            String title,
            int xpReward,
            int hpDeltaComplete,
            int hpDeltaFail
    ) {
        this(dailyPlan, sourceType, sourceId, title, null, null, null, xpReward, hpDeltaComplete, hpDeltaFail);
    }

    public DailyPlanItem(
            DailyPlan dailyPlan,
            ActivitySourceType sourceType,
            Long sourceId,
            String title,
            LocalTime plannedTime,
            int xpReward,
            int hpDeltaComplete,
            int hpDeltaFail
    ) {
        this(dailyPlan, sourceType, sourceId, title, null, plannedTime, null, xpReward, hpDeltaComplete, hpDeltaFail);
    }

    public DailyPlanItem(
            DailyPlan dailyPlan,
            ActivitySourceType sourceType,
            Long sourceId,
            String title,
            String description,
            LocalTime plannedTime,
            LocalTime deadlineTime,
            int xpReward,
            int hpDeltaComplete,
            int hpDeltaFail
    ) {
        this.dailyPlan = dailyPlan;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.title = title;
        this.description = description;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
        this.status = DailyPlanItemStatus.PENDING;
        this.xpReward = xpReward;
        this.hpDeltaComplete = hpDeltaComplete;
        this.hpDeltaFail = hpDeltaFail;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void complete() {
        this.status = DailyPlanItemStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = DailyPlanItemStatus.FAILED;
        this.completedAt = LocalDateTime.now();
    }

    public void reset() {
        this.status = DailyPlanItemStatus.PENDING;
        this.completedAt = null;
        this.focusSpentSeconds = null;
    }

    public void setFocusSpentSeconds(Integer focusSpentSeconds) {
        this.focusSpentSeconds = focusSpentSeconds;
    }

    public void update(String title, String description, LocalTime plannedTime, LocalTime deadlineTime) {
        this.title = title;
        this.description = description;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
    }

    public boolean isDeadlineExpired(LocalDateTime now) {
        if (deadlineTime == null || status != DailyPlanItemStatus.PENDING) {
            return false;
        }
        return !now.isBefore(dailyPlan.getPlanDate().atTime(deadlineTime));
    }

    public Long getId() { return id; }
    public DailyPlan getDailyPlan() { return dailyPlan; }
    public ActivitySourceType getSourceType() { return sourceType; }
    public Long getSourceId() { return sourceId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public DailyPlanItemStatus getStatus() { return status; }
    public int getXpReward() { return xpReward; }
    public int getHpDeltaComplete() { return hpDeltaComplete; }
    public int getHpDeltaFail() { return hpDeltaFail; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public Integer getFocusSpentSeconds() { return focusSpentSeconds; }
}
