package com.dcorp.flowvisior.dto.focus;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.FocusSession;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class FocusSessionResponse {

    private final Long id;
    private final String sessionId;
    private final Long userId;
    private final ActivitySourceType sourceType;
    private final Long sourceId;
    private final String title;
    private final int durationSeconds;
    private final int plannedDurationSeconds;
    private final int actualElapsedSeconds;
    private final int overtimeSeconds;
    private final int creditedDurationSeconds;
    private final FocusCreditedMode creditedMode;
    private final LocalDateTime completedAt;
    private final LocalDate planDate;

    public FocusSessionResponse(FocusSession session) {
        this.id = session.getId();
        this.sessionId = session.getSessionId();
        this.userId = session.getUser().getId();
        this.sourceType = session.getSourceType();
        this.sourceId = session.getSourceId();
        this.title = session.getTitle();
        this.durationSeconds = session.getDurationSeconds();
        this.plannedDurationSeconds = session.getPlannedDurationSeconds();
        this.actualElapsedSeconds = session.getActualElapsedSeconds();
        this.overtimeSeconds = session.getOvertimeSeconds();
        this.creditedDurationSeconds = session.getCreditedDurationSeconds();
        this.creditedMode = session.getCreditedMode();
        this.completedAt = session.getCompletedAt();
        this.planDate = session.getPlanDate();
    }

    public Long getId() { return id; }
    public String getSessionId() { return sessionId; }
    public Long getUserId() { return userId; }
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
}
