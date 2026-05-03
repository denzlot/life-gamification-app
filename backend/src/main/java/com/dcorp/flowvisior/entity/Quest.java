package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "quests")
public class Quest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Difficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestStatus status;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(name = "duration_days", nullable = false)

    private int durationDays;

    @Column(name = "total_steps", nullable = false)

    private int totalSteps;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Quest() {
    }

    public Quest(
            User user,
            String title,
            String description,
            Difficulty difficulty,
            LocalDate startDate,
            int durationDays,
            int totalSteps
    ) {
        this.user = user;
        this.title = title;
        this.description = description;
        this.difficulty = difficulty;
        this.status = QuestStatus.ACTIVE;
        this.startDate = startDate;
        this.durationDays = durationDays;
        this.totalSteps = totalSteps;
        this.targetDate = startDate.plusDays(durationDays - 1L);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String title, String description, Difficulty difficulty, QuestStatus status) {
        this.title = title;
        this.description = description;
        this.difficulty = difficulty;
        this.status = status;
    }

    public void complete() {
        this.status = QuestStatus.COMPLETED;
    }

    public void activate() {
        this.status = QuestStatus.ACTIVE;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
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
