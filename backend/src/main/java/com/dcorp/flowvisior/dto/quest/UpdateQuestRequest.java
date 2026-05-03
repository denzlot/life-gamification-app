package com.dcorp.flowvisior.dto.quest;

import com.dcorp.flowvisior.entity.Difficulty;
import com.dcorp.flowvisior.entity.QuestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UpdateQuestRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    @NotNull
    private Difficulty difficulty;

    @NotNull
    private QuestStatus status;

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public QuestStatus getStatus() {
        return status;
    }
}
