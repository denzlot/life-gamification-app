package com.dcorp.flowvisior.dto.profile;
import com.dcorp.flowvisior.entity.UserGameStats;

public class GameStatsResponse {

    private final int xp;
    private final int level;
    private final int hp;
    private final int maxHp;
    private final int streak;
    private final boolean streakShield;

    public GameStatsResponse(UserGameStats stats) {
        this.xp = stats.getXp();
        this.level = stats.getLevel();
        this.hp = stats.getHp();
        this.maxHp = stats.getMaxHp();
        this.streak = stats.getStreak();
        this.streakShield = stats.isStreakShield();
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

    public int getStreak() {
        return streak;
    }

    public boolean isStreakShield() {
        return streakShield;
    }
}
