package com.dcorp.flowvisior.dto.profile;

import com.dcorp.flowvisior.entity.HpState;
import com.dcorp.flowvisior.entity.UserGameStats;

public class GameStatsResponse {

    private final int xp;
    private final int level;
    private final int hp;
    private final int maxHp;
    private final String hpState;
    private final int streak;
    private final boolean streakShield;
    private final int nextShieldAt;

    public GameStatsResponse(UserGameStats stats) {
        this.xp = stats.getXp();
        this.level = stats.getLevel();
        this.hp = stats.getHp();
        this.maxHp = stats.getMaxHp();
        this.hpState = HpState.of(stats.getHp()).name();
        this.streak = stats.getStreak();
        this.streakShield = stats.isStreakShield();
        this.nextShieldAt = (stats.getStreak() / 7 + 1) * 7;
    }

    public int getXp() { return xp; }
    public int getLevel() { return level; }
    public int getHp() { return hp; }
    public int getMaxHp() { return maxHp; }
    public String getHpState() { return hpState; }
    public int getStreak() { return streak; }
    public boolean isStreakShield() { return streakShield; }
    public int getNextShieldAt() { return nextShieldAt; }
}