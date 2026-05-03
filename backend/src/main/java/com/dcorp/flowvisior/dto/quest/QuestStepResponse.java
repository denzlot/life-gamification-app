package com.dcorp.flowvisior.dto.quest;

import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.QuestStepStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class QuestStepResponse {

    private final Long id;
    private final Long questId;
    private final int stepNumber;
    private final String title;
    private final String description;
    private final LocalDate scheduledDate;
    private final QuestStepStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final LocalDateTime completedAt;

    public QuestStepResponse(QuestStep questStep) {
        this.id = questStep.getId();
        this.questId = questStep.getQuest().getId();
        this.stepNumber = questStep.getStepNumber();
        this.title = questStep.getTitle();
        this.description = questStep.getDescription();
        this.scheduledDate = questStep.getScheduledDate();
        this.status = questStep.getStatus();
        this.createdAt = questStep.getCreatedAt();
        this.updatedAt = questStep.getUpdatedAt();
        this.completedAt = questStep.getCompletedAt();
    }

    public Long getId() {
        return id;
    }

    public Long getQuestId() {
        return questId;
    }

    public int getStepNumber() {
        return stepNumber;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getScheduledDate() {
        return scheduledDate;
    }

    public QuestStepStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}
