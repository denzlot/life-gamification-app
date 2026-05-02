package com.dcorp.flowvisior.dto.profile;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;

public class ProfileResponse {

    private final Long id;
    private final String username;
    private final String role;
    private final GameStatsResponse gameStats;

    public ProfileResponse(User user, UserGameStats stats) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.role = user.getRole().name();
        this.gameStats = new GameStatsResponse(stats);
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public GameStatsResponse getGameStats() {
        return gameStats;
    }
}