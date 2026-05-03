package com.dcorp.flowvisior.dto.stats;

import java.time.LocalDate;

public class AllTimeStatsResponse {

    private final int bestStreak;
    private final int totalXp;
    private final int totalTasksCompleted;
    private final int totalHabitsCompleted;
    private final int totalQuestsCompleted;
    private final int bestWeekXp;
    private final LocalDate bestWeekStartDate;

    public AllTimeStatsResponse(
            int bestStreak,
            int totalXp,
            int totalTasksCompleted,
            int totalHabitsCompleted,
            int totalQuestsCompleted,
            int bestWeekXp,
            LocalDate bestWeekStartDate
    ) {
        this.bestStreak = bestStreak;
        this.totalXp = totalXp;
        this.totalTasksCompleted = totalTasksCompleted;
        this.totalHabitsCompleted = totalHabitsCompleted;
        this.totalQuestsCompleted = totalQuestsCompleted;
        this.bestWeekXp = bestWeekXp;
        this.bestWeekStartDate = bestWeekStartDate;
    }

    public int getBestStreak() {
        return bestStreak;
    }

    public int getTotalXp() {
        return totalXp;
    }

    public int getTotalTasksCompleted() {
        return totalTasksCompleted;
    }

    public int getTotalHabitsCompleted() {
        return totalHabitsCompleted;
    }

    public int getTotalQuestsCompleted() {
        return totalQuestsCompleted;
    }

    public int getBestWeekXp() {
        return bestWeekXp;
    }

    public LocalDate getBestWeekStartDate() {
        return bestWeekStartDate;
    }
}
