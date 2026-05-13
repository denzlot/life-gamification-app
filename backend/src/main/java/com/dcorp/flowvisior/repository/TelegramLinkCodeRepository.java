package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.TelegramLinkCode;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TelegramLinkCodeRepository extends JpaRepository<TelegramLinkCode, Long> {
    Optional<TelegramLinkCode> findByCodeHash(String codeHash);

    void deleteByUserAndUsedAtIsNull(User user);

    void deleteByExpiresAtBeforeOrUsedAtIsNotNull(LocalDateTime expiresAt);
}
