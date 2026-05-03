package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_log")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_plan_id")
    private DailyPlan dailyPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_plan_item_id")
    private DailyPlanItem dailyPlanItem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActivityAction action;

    @Column(name = "xp_delta", nullable = false)
    private int xpDelta;

    @Column(name = "hp_delta", nullable = false)
    private int hpDelta;

    @Column(name = "xp_after", nullable = false)
    private int xpAfter;

    @Column(name = "hp_after", nullable = false)
    private int hpAfter;

    @Column(name = "streak_after", nullable = false)
    private int streakAfter;

    @Column(name = "streak_shield_after", nullable = false)
    private boolean streakShieldAfter;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ActivityLog() {}

    public ActivityLog(User user, DailyPlan dailyPlan, DailyPlanItem item,
                       ActivityAction action,
                       int xpDelta, int hpDelta,
                       int xpAfter, int hpAfter,
                       int streakAfter, boolean streakShieldAfter) {
        this.user = user;
        this.dailyPlan = dailyPlan;
        this.dailyPlanItem = item;
        this.action = action;
        this.xpDelta = xpDelta;
        this.hpDelta = hpDelta;
        this.xpAfter = xpAfter;
        this.hpAfter = hpAfter;
        this.streakAfter = streakAfter;
        this.streakShieldAfter = streakShieldAfter;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public DailyPlan getDailyPlan() { return dailyPlan; }
    public DailyPlanItem getDailyPlanItem() { return dailyPlanItem; }
    public ActivityAction getAction() { return action; }
    public int getXpDelta() { return xpDelta; }
    public int getHpDelta() { return hpDelta; }
    public int getXpAfter() { return xpAfter; }
    public int getHpAfter() { return hpAfter; }
    public int getStreakAfter() { return streakAfter; }
    public boolean isStreakShieldAfter() { return streakShieldAfter; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}