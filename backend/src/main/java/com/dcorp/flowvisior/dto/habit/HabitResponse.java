package com.dcorp.flowvisior.dto.habit;

import com.dcorp.flowvisior.entity.Habit;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class HabitResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final LocalTime plannedTime;
    private final LocalTime deadlineTime;
    private final List<Integer> scheduleDays;
    private final boolean active;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public HabitResponse(Habit habit) {
        this.id = habit.getId();
        this.title = habit.getTitle();
        this.description = habit.getDescription();
        this.plannedTime = habit.getPlannedTime();
        this.deadlineTime = habit.getDeadlineTime();
        this.scheduleDays = habit.getScheduleDays();
        this.active = habit.isActive();
        this.createdAt = habit.getCreatedAt();
        this.updatedAt = habit.getUpdatedAt();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public List<Integer> getScheduleDays() { return scheduleDays; }
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
