package com.dcorp.flowvisior.entity;

import com.dcorp.flowvisior.dto.focus.FocusCreditedMode;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "focus_sessions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_focus_sessions_user_session", columnNames = {"user_id", "session_id"})
        }
)
public class FocusSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, length = 80)
    private String sessionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ActivitySourceType sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "planned_duration_seconds", nullable = false)
    private int plannedDurationSeconds;

    @Column(name = "actual_elapsed_seconds", nullable = false)
    private int actualElapsedSeconds;

    @Column(name = "overtime_seconds", nullable = false)
    private int overtimeSeconds;

    @Column(name = "credited_duration_seconds", nullable = false)
    private int creditedDurationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "credited_mode", nullable = false, length = 20)
    private FocusCreditedMode creditedMode;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected FocusSession() {
    }

    public FocusSession(
            String sessionId,
            User user,
            ActivitySourceType sourceType,
            Long sourceId,
            String title,
            int durationSeconds,
            int plannedDurationSeconds,
            int actualElapsedSeconds,
            int overtimeSeconds,
            int creditedDurationSeconds,
            FocusCreditedMode creditedMode,
            LocalDateTime completedAt,
            LocalDate planDate
    ) {
        this.sessionId = sessionId;
        this.user = user;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.title = title;
        this.durationSeconds = durationSeconds;
        this.plannedDurationSeconds = plannedDurationSeconds;
        this.actualElapsedSeconds = actualElapsedSeconds;
        this.overtimeSeconds = overtimeSeconds;
        this.creditedDurationSeconds = creditedDurationSeconds;
        this.creditedMode = creditedMode;
        this.completedAt = completedAt;
        this.planDate = planDate;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getSessionId() { return sessionId; }
    public User getUser() { return user; }
    public ActivitySourceType getSourceType() { return sourceType; }
    public Long getSourceId() { return sourceId; }
    public String getTitle() { return title; }
    public int getDurationSeconds() { return durationSeconds; }
    public int getPlannedDurationSeconds() { return plannedDurationSeconds; }
    public int getActualElapsedSeconds() { return actualElapsedSeconds; }
    public int getOvertimeSeconds() { return overtimeSeconds; }
    public int getCreditedDurationSeconds() { return creditedDurationSeconds; }
    public FocusCreditedMode getCreditedMode() { return creditedMode; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDate getPlanDate() { return planDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
