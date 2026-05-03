package com.dcorp.flowvisior.dto.calendar;

import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanStatus;

import java.time.LocalDate;

public class CalendarDayResponse {

    private final LocalDate date;
    private final String status;
    private final int completedCount;
    private final int totalCount;
    private final int xpEarned;
    private final int hpDelta;
    private final int streakDay;
    private final boolean shieldUsed;

    // Конструктор для дня с планом
    public CalendarDayResponse(DailyPlan plan, int totalCount) {
        this.date = plan.getPlanDate();
        this.status = plan.getStatus().name();
        this.completedCount = plan.getCompletedCount();
        this.totalCount = totalCount;
        this.xpEarned = plan.getXpEarned();
        this.hpDelta = plan.getHpDelta();
        this.streakDay = plan.getStreakAfterClose();
        this.shieldUsed = plan.isShieldUsed();
    }

    // Конструктор для пустого дня (не открывался)
    public CalendarDayResponse(LocalDate date) {
        this.date = date;
        this.status = "EMPTY";
        this.completedCount = 0;
        this.totalCount = 0;
        this.xpEarned = 0;
        this.hpDelta = 0;
        this.streakDay = 0;
        this.shieldUsed = false;
    }

    public LocalDate getDate() { return date; }
    public String getStatus() { return status; }
    public int getCompletedCount() { return completedCount; }
    public int getTotalCount() { return totalCount; }
    public int getXpEarned() { return xpEarned; }
    public int getHpDelta() { return hpDelta; }
    public int getStreakDay() { return streakDay; }
    public boolean isShieldUsed() { return shieldUsed; }
}