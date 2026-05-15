package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.achievement.AchievementResponse;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.service.AuthenticatedUserService;
import com.dcorp.flowvisior.service.AchievementService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/profile")
public class AchievementController {

    private final AchievementService achievementService;
    private final AuthenticatedUserService authenticatedUserService;

    public AchievementController(
            AchievementService achievementService,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.achievementService = achievementService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @GetMapping("/achievements")
    @Transactional
    public List<AchievementResponse> getMyAchievements() {
        User user = authenticatedUserService.getCurrentUser();
        achievementService.checkAndGrant(user);
        return achievementService.getCatalog(user);
    }
}
