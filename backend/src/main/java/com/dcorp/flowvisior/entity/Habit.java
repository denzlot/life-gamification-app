package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
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

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false, length = 20)
    private HabitScheduleType scheduleType = HabitScheduleType.WEEKLY;

    @Column(name = "monthly_day")
    private Integer monthlyDay;

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "interval_start_date")
    private LocalDate intervalStartDate;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Habit() {
    }

    public Habit(
            User user,
            String title,
            String description,
            LocalTime plannedTime,
            LocalTime deadlineTime,
            HabitScheduleType scheduleType,
            List<Integer> scheduleDays,
            Integer monthlyDay,
            Integer intervalDays,
            LocalDate intervalStartDate
    ) {
        this.user = user;
        this.title = title;
        this.description = description;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
        applySchedule(scheduleType, scheduleDays, monthlyDay, intervalDays, intervalStartDate);
        this.active = true;
    }

    public Habit(User user, String title, String description, LocalTime plannedTime, LocalTime deadlineTime, List<Integer> scheduleDays) {
        this(user, title, description, plannedTime, deadlineTime, HabitScheduleType.WEEKLY, scheduleDays, null, null, null);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.scheduleDays == null || this.scheduleDays.isBlank()) {
            this.scheduleDays = DEFAULT_SCHEDULE_DAYS;
        }
        if (this.scheduleType == null) {
            this.scheduleType = HabitScheduleType.WEEKLY;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.scheduleDays == null || this.scheduleDays.isBlank()) {
            this.scheduleDays = DEFAULT_SCHEDULE_DAYS;
        }
        if (this.scheduleType == null) {
            this.scheduleType = HabitScheduleType.WEEKLY;
        }
    }

    public void update(
            String title,
            String description,
            LocalTime plannedTime,
            LocalTime deadlineTime,
            HabitScheduleType scheduleType,
            List<Integer> scheduleDays,
            Integer monthlyDay,
            Integer intervalDays,
            LocalDate intervalStartDate
    ) {
        this.title = title;
        this.description = description;
        this.plannedTime = plannedTime;
        this.deadlineTime = deadlineTime;
        applySchedule(scheduleType, scheduleDays, monthlyDay, intervalDays, intervalStartDate);
    }

    public void update(String title, String description, LocalTime plannedTime, LocalTime deadlineTime, List<Integer> scheduleDays) {
        update(title, description, plannedTime, deadlineTime, HabitScheduleType.WEEKLY, scheduleDays, null, null, null);
    }

    public void toggleActive() {
        this.active = !this.active;
    }

    public boolean worksOn(LocalDate date) {
        if (date == null) {
            return false;
        }
        return switch (getScheduleType()) {
            case WEEKLY -> getScheduleDays().contains(date.getDayOfWeek().getValue());
            case MONTHLY -> worksMonthlyOn(date);
            case INTERVAL -> worksIntervalOn(date);
        };
    }

    private boolean worksMonthlyOn(LocalDate date) {
        if (monthlyDay == null || monthlyDay < 1 || monthlyDay > 31) {
            return false;
        }
        return date.getDayOfMonth() == Math.min(monthlyDay, date.lengthOfMonth());
    }

    private boolean worksIntervalOn(LocalDate date) {
        if (intervalDays == null || intervalDays < 1 || intervalStartDate == null || date.isBefore(intervalStartDate)) {
            return false;
        }
        return ChronoUnit.DAYS.between(intervalStartDate, date) % intervalDays == 0;
    }

    private void applySchedule(
            HabitScheduleType scheduleType,
            List<Integer> scheduleDays,
            Integer monthlyDay,
            Integer intervalDays,
            LocalDate intervalStartDate
    ) {
        this.scheduleType = scheduleType == null ? HabitScheduleType.WEEKLY : scheduleType;
        this.scheduleDays = normalizeScheduleDays(scheduleDays);
        this.monthlyDay = this.scheduleType == HabitScheduleType.MONTHLY ? monthlyDay : null;
        this.intervalDays = this.scheduleType == HabitScheduleType.INTERVAL ? intervalDays : null;
        this.intervalStartDate = this.scheduleType == HabitScheduleType.INTERVAL ? intervalStartDate : null;
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
    public HabitScheduleType getScheduleType() { return scheduleType == null ? HabitScheduleType.WEEKLY : scheduleType; }
    public List<Integer> getScheduleDays() {
        String value = scheduleDays == null || scheduleDays.isBlank() ? DEFAULT_SCHEDULE_DAYS : scheduleDays;
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .map(Integer::parseInt)
                .toList();
    }
    public Integer getMonthlyDay() { return monthlyDay; }
    public Integer getIntervalDays() { return intervalDays; }
    public LocalDate getIntervalStartDate() { return intervalStartDate; }
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
