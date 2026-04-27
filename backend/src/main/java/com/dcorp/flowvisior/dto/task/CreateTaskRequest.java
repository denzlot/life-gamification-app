package com.dcorp.flowvisior.dto.task;

import com.dcorp.flowvisior.entity.Difficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreateTaskRequest  {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    @NotNull
    private Difficulty difficulty;

    private LocalDate deadlineDate;

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public LocalDate getDeadlineDate() {
        return deadlineDate;
    }
}