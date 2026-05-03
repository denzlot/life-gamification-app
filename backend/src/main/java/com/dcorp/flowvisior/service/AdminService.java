package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.admin.AdminUserResponse;
import com.dcorp.flowvisior.dto.admin.UpdateGameStatsRequest;
import com.dcorp.flowvisior.dto.admin.UpdateUserStatusRequest;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;
import com.dcorp.flowvisior.entity.UserStatus;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final UserGameStatsRepository userGameStatsRepository;

    public AdminService(
            UserRepository userRepository,
            UserGameStatsRepository userGameStatsRepository
    ) {
        this.userRepository = userRepository;
        this.userGameStatsRepository = userGameStatsRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> {
                    UserGameStats stats = userGameStatsRepository.findByUser(user)
                            .orElseThrow();
                    return new AdminUserResponse(user, stats);
                })
                .toList();
    }

    @Transactional
    public AdminUserResponse updateUserStatus(Long userId, UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"
                ));

        if (request.getStatus() == UserStatus.BANNED) {
            user.ban();
        } else {
            user.unban();
        }

        userRepository.save(user);

        UserGameStats stats = userGameStatsRepository.findByUser(user).orElseThrow();
        return new AdminUserResponse(user, stats);
    }

    @Transactional
    public AdminUserResponse updateGameStats(Long userId, UpdateGameStatsRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"
                ));

        UserGameStats stats = userGameStatsRepository.findByUser(user).orElseThrow();

        if (request.getXp() != null) stats.addXp(request.getXp() - stats.getXp());
        if (request.getHp() != null) stats.setHp(request.getHp());
        if (request.getStreak() != null) stats.setStreak(request.getStreak());

        userGameStatsRepository.save(stats);
        return new AdminUserResponse(user, stats);
    }
}