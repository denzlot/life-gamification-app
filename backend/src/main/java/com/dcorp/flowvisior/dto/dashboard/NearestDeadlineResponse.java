package com.dcorp.flowvisior.dto.dashboard;

import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.entity.TaskStatus;

import java.time.LocalDate;
import java.time.LocalTime;

public class NearestDeadlineResponse {

    private final Long id;
    private final String title;
    private final TaskStatus status;
    private final LocalDate deadlineDate;
    private final LocalTime plannedTime;

    public NearestDeadlineResponse(Task task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.status = task.getStatus();
        this.deadlineDate = task.getDeadlineDate();
        this.plannedTime = task.getPlannedTime();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public TaskStatus getStatus() { return status; }
    public LocalDate getDeadlineDate() { return deadlineDate; }
    public LocalTime getPlannedTime() { return plannedTime; }
}
