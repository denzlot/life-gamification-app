package com.dcorp.flowvisior.dto.stats;

public class StreakHistoryResponse {

    private final String month;
    private final int maxStreak;

    public StreakHistoryResponse(String month, int maxStreak) {
        this.month = month;
        this.maxStreak = maxStreak;
    }

    public String getMonth() {
        return month;
    }

    public int getMaxStreak() {
        return maxStreak;
    }
}
