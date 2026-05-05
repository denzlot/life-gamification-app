package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // Date where the task should appear in the daily plan.
    @Column(name = "deadline_date")
    private LocalDate deadlineDate;

    // Planned time is soft. Missing it does not fail the task.
    @Column(name = "planned_time")
    private LocalTime plannedTime;

    // Deadline time is hard. Pending daily plan items are auto-failed after this time on the plan date.
    @Column(name = "deadline_time")
    private LocalTime deadlineTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Task() {
    }

    public Task(User user, String title, String description, LocalDate deadlineDate, LocalTime plannedTime, LocalTime deadlineTime) {
        this.user = user;
        this.title = title;
        this.description = description;
        this.deadlineDate = deadlineDate;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
        this.status = TaskStatus.TODO;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.status == null) {
            this.status = TaskStatus.TODO;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String title, String description, LocalDate deadlineDate, LocalTime plannedTime, LocalTime deadlineTime) {
        this.title = title;
        this.description = description;
        this.deadlineDate = deadlineDate;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public TaskStatus getStatus() { return status; }
    public LocalDate getDeadlineDate() { return deadlineDate; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
