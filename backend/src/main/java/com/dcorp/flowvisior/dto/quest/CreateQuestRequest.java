package com.dcorp.flowvisior.dto.quest;

import com.dcorp.flowvisior.entity.Difficulty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreateQuestRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    @NotNull
    private Difficulty difficulty;

    @NotNull
    private LocalDate startDate;

    @Min(1)
    private int durationDays;

    @Min(1)
    private int totalSteps;

    @NotBlank
    @Size(max = 160)
    private String baseStepTitle;

    private String baseStepDescription;

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public int getDurationDays() {
        return durationDays;
    }

    public int getTotalSteps() {
        return totalSteps;
    }

    public String getBaseStepTitle() {
        return baseStepTitle;
    }

    public String getBaseStepDescription() {
        return baseStepDescription;
    }
}
