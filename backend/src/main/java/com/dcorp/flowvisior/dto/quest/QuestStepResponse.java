package com.dcorp.flowvisior.dto.quest;

import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.QuestStepStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class QuestStepResponse {

    private final Long id;
    private final Long questId;
    private final int stepNumber;
    private final String title;
    private final String description;
    private final LocalDate scheduledDate;
    private final LocalDate baselineScheduledDate;
    private final LocalTime plannedTime;
    private final LocalTime deadlineTime;
    private final QuestStepStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final LocalDateTime completedAt;

    public QuestStepResponse(QuestStep step) {
        this.id = step.getId();
        this.questId = step.getQuest().getId();
        this.stepNumber = step.getStepNumber();
        this.title = step.getTitle();
        this.description = step.getDescription();
        this.scheduledDate = step.getScheduledDate();
        this.baselineScheduledDate = step.getBaselineScheduledDate();
        this.plannedTime = step.getPlannedTime();
        this.deadlineTime = step.getDeadlineTime();
        this.status = step.getStatus();
        this.createdAt = step.getCreatedAt();
        this.updatedAt = step.getUpdatedAt();
        this.completedAt = step.getCompletedAt();
    }

    public Long getId() { return id; }
    public Long getQuestId() { return questId; }
    public int getStepNumber() { return stepNumber; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public LocalDate getBaselineScheduledDate() { return baselineScheduledDate; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public QuestStepStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
