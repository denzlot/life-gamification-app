package com.dcorp.flowvisior.dto.dailyplan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public class UpdateDailyPlanItemRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
}
