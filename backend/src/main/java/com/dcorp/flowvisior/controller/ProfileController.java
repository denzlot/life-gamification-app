package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.profile.ProfileResponse;
import com.dcorp.flowvisior.service.AuthenticatedUserService;
import com.dcorp.flowvisior.service.UserGameStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final AuthenticatedUserService authenticatedUserService;
    private final UserGameStatsService userGameStatsService;

    public ProfileController(
            AuthenticatedUserService authenticatedUserService,
            UserGameStatsService userGameStatsService
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.userGameStatsService = userGameStatsService;
    }

    @GetMapping
    public ProfileResponse getProfile() {
        var user = authenticatedUserService.getCurrentUser();
        var stats = userGameStatsService.getOrCreateFor(user);

        return new ProfileResponse(user, stats);
    }
}