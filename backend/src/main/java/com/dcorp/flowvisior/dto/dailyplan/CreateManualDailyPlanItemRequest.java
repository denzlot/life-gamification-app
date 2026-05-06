package com.dcorp.flowvisior.dto.dailyplan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public class CreateManualDailyPlanItemRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    @Size(max = 5000)
    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
}
