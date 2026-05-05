package com.dcorp.flowvisior.dto.quest;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

public class CreateQuestRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    @NotNull
    private LocalDate startDate;

    @Min(1)
    private int durationDays;

    @Min(1)
    @Max(365)
    private int totalSteps;

    @NotBlank
    @Size(max = 150)
    private String baseStepTitle;

    private String baseStepDescription;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public LocalDate getStartDate() { return startDate; }
    public int getDurationDays() { return durationDays; }
    public int getTotalSteps() { return totalSteps; }
    public String getBaseStepTitle() { return baseStepTitle; }
    public String getBaseStepDescription() { return baseStepDescription; }
}
