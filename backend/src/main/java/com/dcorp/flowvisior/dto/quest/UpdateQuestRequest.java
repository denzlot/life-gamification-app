package com.dcorp.flowvisior.dto.quest;

import com.dcorp.flowvisior.entity.QuestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public class UpdateQuestRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    @NotNull
    private QuestStatus status;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public QuestStatus getStatus() { return status; }
}
