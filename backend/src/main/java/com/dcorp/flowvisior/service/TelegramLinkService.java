package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.telegram.CreateTelegramLinkResponse;
import com.dcorp.flowvisior.dto.telegram.TelegramSettingsRequest;
import com.dcorp.flowvisior.dto.telegram.TelegramSettingsResponse;
import com.dcorp.flowvisior.entity.TelegramLinkCode;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TelegramLinkCodeRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
public class TelegramLinkService {

    private static final int LINK_CODE_BYTES = 24;
    private static final int LINK_CODE_TTL_MINUTES = 15;
    private static final Pattern LINK_CODE_PATTERN = Pattern.compile("[A-Za-z0-9_-]{32,64}");
    private static final Pattern BOT_USERNAME_PATTERN = Pattern.compile("[A-Za-z0-9_]{5,32}");

    private final SecureRandom secureRandom = new SecureRandom();
    private final TelegramLinkCodeRepository telegramLinkCodeRepository;
    private final UserRepository userRepository;
    private final String botUsername;

    public TelegramLinkService(
            TelegramLinkCodeRepository telegramLinkCodeRepository,
            UserRepository userRepository,
            @Value("${telegram.bot.username:}") String botUsername
    ) {
        this.telegramLinkCodeRepository = telegramLinkCodeRepository;
        this.userRepository = userRepository;
        this.botUsername = botUsername;
    }

    @Transactional
    public CreateTelegramLinkResponse createLinkCode(User user) {
        telegramLinkCodeRepository.deleteByUserAndUsedAtIsNull(user);
        telegramLinkCodeRepository.deleteByExpiresAtBeforeOrUsedAtIsNotNull(LocalDateTime.now());

        String rawCode = randomCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(LINK_CODE_TTL_MINUTES);
        telegramLinkCodeRepository.save(new TelegramLinkCode(user, hash(rawCode), expiresAt));

        String normalizedBotUsername = normalizeBotUsername(botUsername);
        String deepLink = normalizedBotUsername == null
                ? null
                : "https://t.me/" + normalizedBotUsername + "?start=" + rawCode;

        return new CreateTelegramLinkResponse(rawCode, deepLink, expiresAt);
    }

    @Transactional
    public User linkByCode(String rawCode, Long telegramChatId) {
        if (rawCode == null || rawCode.isBlank() || telegramChatId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid link code");
        }

        String normalizedCode = rawCode.trim();
        if (!LINK_CODE_PATTERN.matcher(normalizedCode).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid link code");
        }

        TelegramLinkCode linkCode = telegramLinkCodeRepository.findByCodeHash(hash(normalizedCode))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid link code"));

        if (!linkCode.isAvailable(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Link code expired");
        }

        User targetUser = linkCode.getUser();
        userRepository.findByTelegramChatId(telegramChatId).ifPresent(existingUser -> {
            if (!Objects.equals(existingUser.getId(), targetUser.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Telegram is already linked to another account");
            }
        });

        if (targetUser.isTelegramLinked() && !targetUser.getTelegramChatId().equals(telegramChatId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already linked to another Telegram chat");
        }

        targetUser.linkTelegram(telegramChatId);
        linkCode.use();
        userRepository.save(targetUser);
        telegramLinkCodeRepository.save(linkCode);
        return targetUser;
    }

    @Transactional
    public TelegramSettingsResponse updateSettings(User user, TelegramSettingsRequest request) {
        user.updateTelegramReminderSettings(
                request.isRemindersEnabled(),
                request.isRemindersEnabled() && request.isPlannedRemindersEnabled(),
                request.isRemindersEnabled() && request.isDeadlineRemindersEnabled()
        );
        userRepository.save(user);
        return new TelegramSettingsResponse(user);
    }

    @Transactional
    public void unlink(User user) {
        user.unlinkTelegram();
        userRepository.save(user);
    }

    private String randomCode() {
        byte[] bytes = new byte[LINK_CODE_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeBotUsername(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim();
        if (normalized.startsWith("@")) {
            normalized = normalized.substring(1);
        }

        return BOT_USERNAME_PATTERN.matcher(normalized).matches() ? normalized : null;
    }

    private String hash(String rawCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawCode.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
