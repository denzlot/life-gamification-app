package com.dcorp.flowvisior.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public class CreateTaskRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    // Date where task is planned. Kept as API compatibility field.
    private LocalDate deadlineDate;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalDate getDeadlineDate() { return deadlineDate; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
}
