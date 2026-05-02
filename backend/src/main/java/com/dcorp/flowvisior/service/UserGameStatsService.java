package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserGameStatsService {

    private final UserGameStatsRepository userGameStatsRepository;

    public UserGameStatsService(UserGameStatsRepository userGameStatsRepository) {
        this.userGameStatsRepository = userGameStatsRepository;
    }

    @Transactional
    public UserGameStats createFor(User user) {
        return userGameStatsRepository.save(new UserGameStats(user));
    }

    @Transactional
    public UserGameStats getOrCreateFor(User user) {
        return userGameStatsRepository.findByUser(user)
                .orElseGet(() -> userGameStatsRepository.save(new UserGameStats(user)));
    }
}