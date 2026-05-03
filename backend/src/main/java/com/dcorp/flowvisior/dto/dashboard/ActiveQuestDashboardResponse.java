package com.dcorp.flowvisior.dto.dashboard;

import com.dcorp.flowvisior.entity.Difficulty;
import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStatus;
import com.dcorp.flowvisior.entity.QuestStep;

import java.time.LocalDate;

public class ActiveQuestDashboardResponse {

    private final Long id;
    private final String title;
    private final Difficulty difficulty;
    private final QuestStatus status;
    private final LocalDate targetDate;
    private final int completedSteps;
    private final int totalSteps;
    private final Long nextStepId;
    private final String nextStepTitle;
    private final LocalDate nextStepDate;

    public ActiveQuestDashboardResponse(
            Quest quest,
            int completedSteps,
            int totalSteps,
            QuestStep nextStep
    ) {
        this.id = quest.getId();
        this.title = quest.getTitle();
        this.difficulty = quest.getDifficulty();
        this.status = quest.getStatus();
        this.targetDate = quest.getTargetDate();
        this.completedSteps = completedSteps;
        this.totalSteps = totalSteps;
        this.nextStepId = nextStep == null ? null : nextStep.getId();
        this.nextStepTitle = nextStep == null ? null : nextStep.getTitle();
        this.nextStepDate = nextStep == null ? null : nextStep.getScheduledDate();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public QuestStatus getStatus() {
        return status;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public int getCompletedSteps() {
        return completedSteps;
    }

    public int getTotalSteps() {
        return totalSteps;
    }

    public Long getNextStepId() {
        return nextStepId;
    }

    public String getNextStepTitle() {
        return nextStepTitle;
    }

    public LocalDate getNextStepDate() {
        return nextStepDate;
    }
}
