package com.dcorp.flowvisior.dto.quest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class CreateQuestRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    @Size(max = 5000)
    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    @NotNull
    private LocalDate startDate;

    @Min(1)
    @Max(3650)
    private int durationDays;

    @Min(1)
    @Max(365)
    private int totalSteps;

    @NotBlank
    @Size(max = 150)
    private String baseStepTitle;

    @Size(max = 5000)
    private String baseStepDescription;

    @Valid
    @Size(max = 365)
    private List<CreateQuestStepRequest> steps;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public LocalDate getStartDate() { return startDate; }
    public int getDurationDays() { return durationDays; }
    public int getTotalSteps() { return totalSteps; }
    public String getBaseStepTitle() { return baseStepTitle; }
    public String getBaseStepDescription() { return baseStepDescription; }
    public List<CreateQuestStepRequest> getSteps() { return steps; }

    public static class CreateQuestStepRequest {
        @NotBlank
        @Size(max = 160)
        private String title;

        @Size(max = 5000)
        private String description;

        @NotNull
        private LocalDate baselineScheduledDate;

        private LocalTime plannedTime;

        private LocalTime deadlineTime;

        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public LocalDate getBaselineScheduledDate() { return baselineScheduledDate; }
        public LocalTime getPlannedTime() { return plannedTime; }
        public LocalTime getDeadlineTime() { return deadlineTime; }
    }
}
