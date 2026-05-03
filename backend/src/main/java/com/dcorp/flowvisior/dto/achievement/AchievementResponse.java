package com.dcorp.flowvisior.dto.achievement;

import com.dcorp.flowvisior.entity.UserAchievement;
import java.time.LocalDateTime;

public class AchievementResponse {

    private final Long id;
    private final String key;
    private final String title;
    private final String description;
    private final String category;
    private final int xpReward;
    private final LocalDateTime unlockedAt;

    public AchievementResponse(UserAchievement ua) {
        this.id = ua.getAchievement().getId();
        this.key = ua.getAchievement().getKey();
        this.title = ua.getAchievement().getTitle();
        this.description = ua.getAchievement().getDescription();
        this.category = ua.getAchievement().getCategory();
        this.xpReward = ua.getAchievement().getXpReward();
        this.unlockedAt = ua.getUnlockedAt();
    }

    public Long getId() { return id; }
    public String getKey() { return key; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public int getXpReward() { return xpReward; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
}