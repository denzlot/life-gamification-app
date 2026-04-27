package com.dcorp.flowvisior.dto.task;

import com.dcorp.flowvisior.entity.Difficulty;
import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.entity.TaskStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaskResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final Difficulty difficulty;
    private final TaskStatus status;
    private final LocalDate deadlineDate;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public TaskResponse(Task task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();
        this.difficulty = task.getDifficulty();
        this.status = task.getStatus();
        this.deadlineDate = task.getDeadlineDate();
        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();
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

    public TaskStatus getStatus() {
        return status;
    }

    public LocalDate getDeadlineDate() {
        return deadlineDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}