package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.achievement.AchievementResponse;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.UserAchievementRepository;
import com.dcorp.flowvisior.service.AuthenticatedUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/profile")
public class AchievementController {

    private final UserAchievementRepository userAchievementRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public AchievementController(
            UserAchievementRepository userAchievementRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.userAchievementRepository = userAchievementRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @GetMapping("/achievements")
    public List<AchievementResponse> getMyAchievements() {
        User user = authenticatedUserService.getCurrentUser();
        return userAchievementRepository.findByUserOrderByUnlockedAtDesc(user)
                .stream()
                .map(AchievementResponse::new)
                .toList();
    }
}