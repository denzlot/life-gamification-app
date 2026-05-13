package com.dcorp.flowvisior.dto.profile;

import java.time.LocalDateTime;

public class UnlockResponse {
    private final String key;
    private final String type;
    private final String targetKey;
    private final String title;
    private final int requiredLevel;
    private final boolean unlocked;
    private final LocalDateTime unlockedAt;

    public UnlockResponse(
            String key,
            String type,
            String targetKey,
            String title,
            int requiredLevel,
            boolean unlocked,
            LocalDateTime unlockedAt
    ) {
        this.key = key;
        this.type = type;
        this.targetKey = targetKey;
        this.title = title;
        this.requiredLevel = requiredLevel;
        this.unlocked = unlocked;
        this.unlockedAt = unlockedAt;
    }

    public String getKey() { return key; }
    public String getType() { return type; }
    public String getTargetKey() { return targetKey; }
    public String getTitle() { return title; }
    public int getRequiredLevel() { return requiredLevel; }
    public boolean isUnlocked() { return unlocked; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
}
