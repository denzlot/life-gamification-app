package com.dcorp.flowvisior.entity;

public enum DayQuality {
    EMPTY("Пустой", 0),
    BAD("Плохой", 80),
    NORMAL("Нормальный", 100),
    GOOD("Хороший", 115);

    private final String label;
    private final int xpReward;

    DayQuality(String label, int xpReward) {
        this.label = label;
        this.xpReward = xpReward;
    }

    public String getLabel() {
        return label;
    }

    public int getXpReward() {
        return xpReward;
    }

    public boolean continuesStreak() {
        return this != EMPTY;
    }

    public int hpDelta(int totalCount) {
        return switch (this) {
            case EMPTY -> totalCount > 0 ? -12 : -5;
            case BAD -> -3;
            case NORMAL, GOOD -> 0;
        };
    }

    public static DayQuality fromCounts(int completedCount, int totalCount) {
        if (completedCount <= 0) {
            return EMPTY;
        }

        double completionRate = totalCount <= 0 ? 0d : (double) completedCount / totalCount;
        if (completionRate < 0.5d) {
            return BAD;
        }
        if (completionRate < 0.8d) {
            return NORMAL;
        }
        return GOOD;
    }
}
