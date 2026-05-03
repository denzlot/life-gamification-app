package com.dcorp.flowvisior.dto.stats;

public class ThisWeekStatsResponse {

    private final int xp;
    private final int tasksCompleted;
    private final int habitsCompleted;
    private final int activeDays;

    public ThisWeekStatsResponse(
            int xp,
            int tasksCompleted,
            int habitsCompleted,
            int activeDays
    ) {
        this.xp = xp;
        this.tasksCompleted = tasksCompleted;
        this.habitsCompleted = habitsCompleted;
        this.activeDays = activeDays;
    }

    public int getXp() {
        return xp;
    }

    public int getTasksCompleted() {
        return tasksCompleted;
    }

    public int getHabitsCompleted() {
        return habitsCompleted;
    }

    public int getActiveDays() {
        return activeDays;
    }
}
