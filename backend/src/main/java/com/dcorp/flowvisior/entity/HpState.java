package com.dcorp.flowvisior.entity;

public enum HpState {
    GREAT,
    NORMAL,
    TIRED,
    EXHAUSTED,
    CRITICAL;

    public static HpState of(int hp) {
        if (hp >= 80) return GREAT;
        if (hp >= 50) return NORMAL;
        if (hp >= 30) return TIRED;
        if (hp >= 10) return EXHAUSTED;
        return CRITICAL;
    }
}