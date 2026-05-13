package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByTelegramChatId(Long telegramChatId);
    boolean existsByUsername(String username);
    List<User> findByTelegramChatIdIsNotNullAndTelegramRemindersEnabledTrue();
}
