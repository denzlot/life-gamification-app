package com.dcorp.flowvisior.dto.dashboard;

import com.dcorp.flowvisior.entity.HpState;
import com.dcorp.flowvisior.entity.UserGameStats;

import java.util.List;

public class DashboardResponse {

    private final int xp;
    private final int level;
    private final int hp;
    private final int maxHp;
    private final String hpState;
    private final int streak;
    private final boolean streakShield;
    private final int nextShieldAt;
    private final TodaySummaryResponse todaySummary;
    private final List<NearestDeadlineResponse> nearestDeadlines;
    private final List<ActiveQuestDashboardResponse> activeQuests;

    public DashboardResponse(
            UserGameStats stats,
            TodaySummaryResponse todaySummary,
            List<NearestDeadlineResponse> nearestDeadlines,
            List<ActiveQuestDashboardResponse> activeQuests
    ) {
        this.xp = stats.getXp();
        this.level = stats.getLevel();
        this.hp = stats.getHp();
        this.maxHp = stats.getMaxHp();
        this.hpState = HpState.of(stats.getHp()).name();
        this.streak = stats.getStreak();
        this.streakShield = stats.isStreakShield();
        this.nextShieldAt = (stats.getStreak() / 7 + 1) * 7;
        this.todaySummary = todaySummary;
        this.nearestDeadlines = nearestDeadlines;
        this.activeQuests = activeQuests;
    }

    public int getXp() {
        return xp;
    }

    public int getLevel() {
        return level;
    }

    public int getHp() {
        return hp;
    }

    public int getMaxHp() {
        return maxHp;
    }

    public String getHpState() {
        return hpState;
    }

    public int getStreak() {
        return streak;
    }

    public boolean isStreakShield() {
        return streakShield;
    }

    public int getNextShieldAt() {
        return nextShieldAt;
    }

    public TodaySummaryResponse getTodaySummary() {
        return todaySummary;
    }

    public List<NearestDeadlineResponse> getNearestDeadlines() {
        return nearestDeadlines;
    }

    public List<ActiveQuestDashboardResponse> getActiveQuests() {
        return activeQuests;
    }
}
