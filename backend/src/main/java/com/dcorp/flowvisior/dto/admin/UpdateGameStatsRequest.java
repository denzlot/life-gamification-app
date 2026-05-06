package com.dcorp.flowvisior.dto.admin;

import jakarta.validation.constraints.Min;

public class UpdateGameStatsRequest {

    @Min(0)
    private Integer xp;

    @Min(0)
    private Integer hp;

    @Min(0)
    private Integer streak;

    public Integer getXp() { return xp; }
    public Integer getHp() { return hp; }
    public Integer getStreak() { return streak; }
}
