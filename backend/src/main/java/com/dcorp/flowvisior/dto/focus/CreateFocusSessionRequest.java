package com.dcorp.flowvisior.dto.focus;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class CreateFocusSessionRequest {

    @NotBlank
    @Size(max = 80)
    private String sessionId;

    @NotNull
    private ActivitySourceType sourceType;

    private Long sourceId;

    @NotBlank
    @Size(max = 160)
    private String title;

    @Min(1)
    @Max(86400)
    private int durationSeconds;

    @Min(1)
    @Max(86400)
    private Integer plannedDurationSeconds;

    @Min(1)
    @Max(86400)
    private Integer actualElapsedSeconds;

    @Min(0)
    @Max(86400)
    private Integer overtimeSeconds;

    @Min(1)
    @Max(86400)
    private Integer creditedDurationSeconds;

    private FocusCreditedMode creditedMode;

    @NotNull
    private LocalDateTime completedAt;

    @NotNull
    private LocalDate planDate;

    public String getSessionId() { return sessionId; }
    public ActivitySourceType getSourceType() { return sourceType; }
    public Long getSourceId() { return sourceId; }
    public String getTitle() { return title; }
    public int getDurationSeconds() { return durationSeconds; }
    public Integer getPlannedDurationSeconds() { return plannedDurationSeconds; }
    public Integer getActualElapsedSeconds() { return actualElapsedSeconds; }
    public Integer getOvertimeSeconds() { return overtimeSeconds; }
    public Integer getCreditedDurationSeconds() { return creditedDurationSeconds; }
    public FocusCreditedMode getCreditedMode() { return creditedMode; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDate getPlanDate() { return planDate; }
}
