package com.dcorp.flowvisior.dto.habit;

import com.dcorp.flowvisior.entity.HabitScheduleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class CreateHabitRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    @Size(max = 5000)
    private String description;

    private LocalTime plannedTime;

    private LocalTime deadlineTime;

    private HabitScheduleType scheduleType = HabitScheduleType.WEEKLY;

    private List<Integer> scheduleDays;

    @Min(1)
    @Max(31)
    private Integer monthlyDay;

    @Min(1)
    @Max(3650)
    private Integer intervalDays;

    private LocalDate intervalStartDate;

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalTime getPlannedTime() { return plannedTime; }
    public LocalTime getDeadlineTime() { return deadlineTime; }
    public HabitScheduleType getScheduleType() { return scheduleType == null ? HabitScheduleType.WEEKLY : scheduleType; }
    public List<Integer> getScheduleDays() { return scheduleDays; }
    public Integer getMonthlyDay() { return monthlyDay; }
    public Integer getIntervalDays() { return intervalDays; }
    public LocalDate getIntervalStartDate() { return intervalStartDate; }
}
