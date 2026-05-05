package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Entity
@Table(name = "habits")
public class Habit {

    private static final String DEFAULT_SCHEDULE_DAYS = "1,2,3,4,5,6,7";

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

    @Column(name = "planned_time")
    private LocalTime plannedTime;

    @Column(name = "deadline_time")
    private LocalTime deadlineTime;

    @Column(name = "schedule_days", nullable = false, length = 32)
    private String scheduleDays = DEFAULT_SCHEDULE_DAYS;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Habit() {
    }

    public Habit(User user, String title, String description, LocalTime plannedTime, LocalTime deadlineTime, List<Integer> scheduleDays) {
        this.user = user;
        this.title = title;
        this.description = description;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
        this.scheduleDays = normalizeScheduleDays(scheduleDays);
        this.active = true;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.scheduleDays == null || this.scheduleDays.isBlank()) {
            this.scheduleDays = DEFAULT_SCHEDULE_DAYS;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.scheduleDays == null || this.scheduleDays.isBlank()) {
            this.scheduleDays = DEFAULT_SCHEDULE_DAYS;
        }
    }

    public void update(String title, String description, LocalTime plannedTime, LocalTime deadlineTime, List<Integer> scheduleDays) {
        this.title = title;
        this.description = description;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
        this.scheduleDays = normalizeScheduleDays(scheduleDays);
    }

    public void toggleActive() {
        this.active = !this.active;
    }

    public boolean worksOn(LocalDate date) {
        return getScheduleDays().contains(date.getDayOfWeek().getValue());
    }

    public static String normalizeScheduleDays(List<Integer> days) {
        if (days == null || days.isEmpty()) {
            return DEFAULT_SCHEDULE_DAYS;
        }

        String normalized = days.stream()
                .filter(Objects::nonNull)
                .filter(day -> day >= 1 && day <= 7)
                .distinct()
                .sorted()
                .map(String::valueOf)
                .collect(Collectors.joining(","));

        return normalized.isBlank() ? DEFAULT_SCHEDULE_DAYS : normalized;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public List<Integer> getScheduleDays() {
        String value = scheduleDays == null || scheduleDays.isBlank() ? DEFAULT_SCHEDULE_DAYS : scheduleDays;
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .map(Integer::parseInt)
                .toList();
    }
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
