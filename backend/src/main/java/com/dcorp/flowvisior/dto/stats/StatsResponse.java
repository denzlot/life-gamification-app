package com.dcorp.flowvisior.dto.stats;

import java.util.List;

public class StatsResponse {

    private final AllTimeStatsResponse allTime;
    private final ThisWeekStatsResponse thisWeek;
    private final List<XpByWeekResponse> xpByWeek;
    private final List<StreakHistoryResponse> streakHistory;

    public StatsResponse(
            AllTimeStatsResponse allTime,
            ThisWeekStatsResponse thisWeek,
            List<XpByWeekResponse> xpByWeek,
            List<StreakHistoryResponse> streakHistory
    ) {
        this.allTime = allTime;
        this.thisWeek = thisWeek;
        this.xpByWeek = xpByWeek;
        this.streakHistory = streakHistory;
    }

    public AllTimeStatsResponse getAllTime() {
        return allTime;
    }

    public ThisWeekStatsResponse getThisWeek() {
        return thisWeek;
    }

    public List<XpByWeekResponse> getXpByWeek() {
        return xpByWeek;
    }

    public List<StreakHistoryResponse> getStreakHistory() {
        return streakHistory;
    }
}
