package com.dcorp.flowvisior.dto.stats;

import java.time.LocalDate;

public class XpByWeekResponse {

    private final LocalDate weekStart;
    private final int xp;

    public XpByWeekResponse(LocalDate weekStart, int xp) {
        this.weekStart = weekStart;
        this.xp = xp;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public int getXp() {
        return xp;
    }
}
