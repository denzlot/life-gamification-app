package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

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
        this.dailyPlan = dailyPlan;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.title = title;
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
    }

    public Long getId() {
        return id;
    }

    public DailyPlan getDailyPlan() {
        return dailyPlan;
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

    public DailyPlanItemStatus getStatus() {
        return status;
    }

    public int getXpReward() {
        return xpReward;
    }

    public int getHpDeltaComplete() {
        return hpDeltaComplete;
    }

    public int getHpDeltaFail() {
        return hpDeltaFail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}