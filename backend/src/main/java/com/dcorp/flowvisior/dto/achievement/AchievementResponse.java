package com.dcorp.flowvisior.dto.achievement;

import com.dcorp.flowvisior.entity.Achievement;
import java.time.LocalDateTime;

public class AchievementResponse {

    private final Long id;
    private final String key;
    private final String title;
    private final String description;
    private final String category;
    private final int xpReward;
    private final int requiredValue;
    private final boolean unlocked;
    private final LocalDateTime unlockedAt;
    private final int progress;

    public AchievementResponse(Achievement achievement, boolean unlocked, LocalDateTime unlockedAt, int progress) {
        this.id = achievement.getId();
        this.key = achievement.getKey();
        this.title = achievement.getTitle();
        this.description = achievement.getDescription();
        this.category = achievement.getCategory();
        this.xpReward = achievement.getXpReward();
        this.requiredValue = achievement.getRequiredValue();
        this.unlocked = unlocked;
        this.unlockedAt = unlockedAt;
        this.progress = progress;
    }

    public Long getId() { return id; }
    public String getKey() { return key; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public int getXpReward() { return xpReward; }
    public int getRequiredValue() { return requiredValue; }
    public boolean isUnlocked() { return unlocked; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public int getProgress() { return progress; }
}
