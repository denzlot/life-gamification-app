package com.dcorp.flowvisior.dto.habit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
import java.util.List;

public class UpdateHabitRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    @Size(max = 5000)
    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    private List<Integer> scheduleDays;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public List<Integer> getScheduleDays() { return scheduleDays; }
}
