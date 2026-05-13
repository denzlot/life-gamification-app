package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.TelegramCallbackToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TelegramCallbackTokenRepository extends JpaRepository<TelegramCallbackToken, Long> {
    Optional<TelegramCallbackToken> findByNonce(String nonce);

    void deleteByExpiresAtBeforeOrUsedAtIsNotNull(LocalDateTime expiresAt);
}
