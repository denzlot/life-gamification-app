package com.dcorp.flowvisior.dto.calendar;

import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DayQuality;

import java.time.LocalDate;

public class CalendarDayResponse {

    private final LocalDate date;
    private final String status;
    private final int completedCount;
    private final int totalCount;
    private final int taskCount;
    private final int habitCount;
    private final int questCount;
    private final int taskCompletedCount;
    private final int habitCompletedCount;
    private final int questCompletedCount;
    private final int xpEarned;
    private final int hpDelta;
    private final int streakDay;
    private final boolean shieldUsed;
    private final DayQuality dayQuality;

    public CalendarDayResponse(
            DailyPlan plan,
            int completedCount,
            int totalCount,
            int taskCount,
            int habitCount,
            int questCount,
            int taskCompletedCount,
            int habitCompletedCount,
            int questCompletedCount
    ) {
        this.date = plan.getPlanDate();
        this.status = plan.getStatus().name();
        this.completedCount = completedCount;
        this.totalCount = totalCount;
        this.taskCount = taskCount;
        this.habitCount = habitCount;
        this.questCount = questCount;
        this.taskCompletedCount = taskCompletedCount;
        this.habitCompletedCount = habitCompletedCount;
        this.questCompletedCount = questCompletedCount;
        this.xpEarned = plan.getXpEarned();
        this.hpDelta = plan.getHpDelta();
        this.streakDay = plan.getStreakAfterClose();
        this.shieldUsed = plan.isShieldUsed();
        this.dayQuality = plan.isClosed() ? plan.getDayQuality() : null;
    }

    public CalendarDayResponse(DailyPlan plan, int completedCount, int totalCount) {
        this(plan, completedCount, totalCount, 0, 0, 0, 0, 0, 0);
    }

    public CalendarDayResponse(LocalDate date) {
        this.date = date;
        this.status = "EMPTY";
        this.completedCount = 0;
        this.totalCount = 0;
        this.taskCount = 0;
        this.habitCount = 0;
        this.questCount = 0;
        this.taskCompletedCount = 0;
        this.habitCompletedCount = 0;
        this.questCompletedCount = 0;
        this.xpEarned = 0;
        this.hpDelta = 0;
        this.streakDay = 0;
        this.shieldUsed = false;
        this.dayQuality = null;
    }

    public LocalDate getDate() { return date; }
    public String getStatus() { return status; }
    public int getCompletedCount() { return completedCount; }
    public int getTotalCount() { return totalCount; }
    public int getTaskCount() { return taskCount; }
    public int getHabitCount() { return habitCount; }
    public int getQuestCount() { return questCount; }
    public int getTaskCompletedCount() { return taskCompletedCount; }
    public int getHabitCompletedCount() { return habitCompletedCount; }
    public int getQuestCompletedCount() { return questCompletedCount; }
    public int getXpEarned() { return xpEarned; }
    public int getHpDelta() { return hpDelta; }
    public int getStreakDay() { return streakDay; }
    public boolean isShieldUsed() { return shieldUsed; }
    public DayQuality getDayQuality() { return dayQuality; }
}
