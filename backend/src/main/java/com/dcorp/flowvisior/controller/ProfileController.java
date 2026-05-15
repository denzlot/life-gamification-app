package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.profile.ProfilePreferencesRequest;
import com.dcorp.flowvisior.dto.profile.ProfileResponse;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import com.dcorp.flowvisior.service.AuthenticatedUserService;
import com.dcorp.flowvisior.service.UnlockService;
import com.dcorp.flowvisior.service.UserGameStatsService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final AuthenticatedUserService authenticatedUserService;
    private final UserGameStatsService userGameStatsService;
    private final UserGameStatsRepository userGameStatsRepository;
    private final UnlockService unlockService;

    public ProfileController(
            AuthenticatedUserService authenticatedUserService,
            UserGameStatsService userGameStatsService,
            UserGameStatsRepository userGameStatsRepository,
            UnlockService unlockService
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.userGameStatsService = userGameStatsService;
        this.userGameStatsRepository = userGameStatsRepository;
        this.unlockService = unlockService;
    }

    @GetMapping
    @Transactional
    public ProfileResponse getProfile() {
        var user = authenticatedUserService.getCurrentUser();
        var stats = userGameStatsService.getOrCreateFor(user);
        var unlocks = unlockService.syncAndList(user, stats);

        return new ProfileResponse(user, stats, unlocks);
    }

    @PatchMapping("/preferences")
    @Transactional
    public ProfileResponse updatePreferences(@RequestBody ProfilePreferencesRequest request) {
        var user = authenticatedUserService.getCurrentUser();
        var stats = userGameStatsService.getOrCreateFor(user);

        if (request.getTheme() != null) {
            if (!unlockService.isUnlocked(user, stats, "THEME", request.getTheme())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Theme is locked");
            }
            stats.setSelectedTheme(request.getTheme());
        }

        if (request.getCharacter() != null) {
            if (!unlockService.isUnlocked(user, stats, "CHARACTER", request.getCharacter())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Character is locked");
            }
            stats.setSelectedCharacter(request.getCharacter());
        }

        userGameStatsRepository.save(stats);
        var unlocks = unlockService.syncAndList(user, stats);
        return new ProfileResponse(user, stats, unlocks);
    }
}
