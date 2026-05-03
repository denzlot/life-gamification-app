package com.dcorp.flowvisior.dto.admin;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;

public class AdminUserResponse {

    private final Long id;
    private final String username;
    private final String role;
    private final String status;
    private final int xp;
    private final int level;
    private final int hp;
    private final int streak;

    public AdminUserResponse(User user, UserGameStats stats) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.role = user.getRole().name();
        this.status = user.getStatus().name();
        this.xp = stats.getXp();
        this.level = stats.getLevel();
        this.hp = stats.getHp();
        this.streak = stats.getStreak();
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public int getXp() { return xp; }
    public int getLevel() { return level; }
    public int getHp() { return hp; }
    public int getStreak() { return streak; }
}