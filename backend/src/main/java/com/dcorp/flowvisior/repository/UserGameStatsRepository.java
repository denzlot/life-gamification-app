package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserGameStatsRepository extends JpaRepository<UserGameStats, Long> {

    Optional<UserGameStats> findByUser(User user);

}
