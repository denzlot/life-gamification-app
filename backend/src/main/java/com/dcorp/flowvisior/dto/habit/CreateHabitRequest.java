package com.dcorp.flowvisior.dto.habit;

import com.dcorp.flowvisior.entity.Difficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateHabitRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    @NotNull
    private Difficulty difficulty;

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }
}