package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    List<UserAchievement> findByUserOrderByUnlockedAtDesc(User user);

    @Query("SELECT ua.achievement.key FROM UserAchievement ua WHERE ua.user = :user")
    Set<String> findUnlockedKeysByUser(User user);

    boolean existsByUserAndAchievement_Key(User user, String key);
}