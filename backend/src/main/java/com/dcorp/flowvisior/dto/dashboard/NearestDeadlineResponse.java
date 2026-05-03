package com.dcorp.flowvisior.dto.dashboard;

import com.dcorp.flowvisior.entity.Difficulty;
import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.entity.TaskStatus;

import java.time.LocalDate;

public class NearestDeadlineResponse {

    private final Long id;
    private final String title;
    private final Difficulty difficulty;
    private final TaskStatus status;
    private final LocalDate deadlineDate;

    public NearestDeadlineResponse(Task task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.difficulty = task.getDifficulty();
        this.status = task.getStatus();
        this.deadlineDate = task.getDeadlineDate();
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

    public TaskStatus getStatus() {
        return status;
    }

    public LocalDate getDeadlineDate() {
        return deadlineDate;
    }
}
