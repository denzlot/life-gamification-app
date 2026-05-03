package com.dcorp.flowvisior.dto.quest;

import com.dcorp.flowvisior.entity.Difficulty;
import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class QuestResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final Difficulty difficulty;
    private final QuestStatus status;
    private final LocalDate startDate;
    private final LocalDate targetDate;
    private final int durationDays;
    private final int totalSteps;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public QuestResponse(Quest quest) {
        this.id = quest.getId();
        this.title = quest.getTitle();
        this.description = quest.getDescription();
        this.difficulty = quest.getDifficulty();
        this.status = quest.getStatus();
        this.startDate = quest.getStartDate();
        this.targetDate = quest.getTargetDate();
        this.durationDays = quest.getDurationDays();
        this.totalSteps = quest.getTotalSteps();
        this.createdAt = quest.getCreatedAt();
        this.updatedAt = quest.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

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

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public int getDurationDays() {
        return durationDays;
    }

    public int getTotalSteps() {
        return totalSteps;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
