package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "daily_plans",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_daily_plans_user_date", columnNames = {"user_id", "plan_date"})
        }
)
public class DailyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DailyPlanStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    protected DailyPlan() {
    }

    public DailyPlan(User user, LocalDate planDate, DailyPlanStatus status) {
        this.user = user;
        this.planDate = planDate;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void start() {
        this.status = DailyPlanStatus.ACTIVE;
        this.startedAt = LocalDateTime.now();
    }

    public void close() {
        this.status = DailyPlanStatus.CLOSED;
        this.closedAt = LocalDateTime.now();
    }

    public boolean isClosed() {
        return this.status == DailyPlanStatus.CLOSED;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public LocalDate getPlanDate() {
        return planDate;
    }

    public DailyPlanStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }
}