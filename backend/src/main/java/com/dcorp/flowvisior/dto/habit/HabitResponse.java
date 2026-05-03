package com.dcorp.flowvisior.dto.habit;

import com.dcorp.flowvisior.entity.Difficulty;
import com.dcorp.flowvisior.entity.Habit;

import java.time.LocalDateTime;

public class HabitResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final Difficulty difficulty;
    private final boolean active;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public HabitResponse(Habit habit) {
        this.id = habit.getId();
        this.title = habit.getTitle();
        this.description = habit.getDescription();
        this.difficulty = habit.getDifficulty();
        this.active = habit.isActive();
        this.createdAt = habit.getCreatedAt();
        this.updatedAt = habit.getUpdatedAt();
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

    public boolean isActive() {
        return active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}