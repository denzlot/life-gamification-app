package com.dcorp.flowvisior.dto.quest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdateQuestStepRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    @NotNull
    private LocalDate scheduledDate;

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getScheduledDate() {
        return scheduledDate;
    }
}
