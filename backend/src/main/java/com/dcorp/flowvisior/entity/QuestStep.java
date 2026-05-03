package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "quest_steps",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_quest_steps_quest_number", columnNames = {"quest_id", "step_number"})
        }
)
public class QuestStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quest_id", nullable = false)
    private Quest quest;

    @Column(name = "step_number", nullable = false)
    private int stepNumber;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestStepStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    protected QuestStep() {
    }

    public QuestStep(
            Quest quest,
            int stepNumber,
            String title,
            String description,
            LocalDate scheduledDate
    ) {
        this.quest = quest;
        this.stepNumber = stepNumber;
        this.title = title;
        this.description = description;
        this.scheduledDate = scheduledDate;
        this.status = QuestStepStatus.PENDING;
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

    public void update(String title, String description, LocalDate scheduledDate) {
        this.title = title;
        this.description = description;
        this.scheduledDate = scheduledDate;
    }

    public void complete() {
        this.status = QuestStepStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void skip() {
        this.status = QuestStepStatus.SKIPPED;
        this.completedAt = LocalDateTime.now();
    }

    public void reset() {
        this.status = QuestStepStatus.PENDING;
        this.completedAt = null;
    }

    public Long getId() {
        return id;
    }

    public Quest getQuest() {
        return quest;
    }

    public int getStepNumber() {
        return stepNumber;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDate getScheduledDate() {
        return scheduledDate;
    }

    public QuestStepStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}
