package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.profile.UnlockResponse;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;
import com.dcorp.flowvisior.entity.UserUnlock;
import com.dcorp.flowvisior.repository.UserUnlockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class UnlockService {

    private static final List<UnlockRule> RULES = List.of(
            new UnlockRule("theme_dark", "THEME", "dark", "Dark theme", 1, true),
            new UnlockRule("theme_light", "THEME", "light", "Light theme", 1, true),
            new UnlockRule("theme_cosmos", "THEME", "cosmos", "Cosmos theme", 3, false),
            new UnlockRule("theme_vampire", "THEME", "vampire", "Vampire theme", 5, false),
            new UnlockRule("character_lolbot", "CHARACTER", "lolbot", "Мистер Лолбот", 1, true),
            new UnlockRule("character_knight", "CHARACTER", "knight", "Рыцарь", 1, true),
            new UnlockRule("character_astronaut", "CHARACTER", "astronaut", "Астронавт", 3, false),
            new UnlockRule("character_nosferatu", "CHARACTER", "nosferatu", "Носферату", 5, false)
    );

    private final UserUnlockRepository userUnlockRepository;

    public UnlockService(UserUnlockRepository userUnlockRepository) {
        this.userUnlockRepository = userUnlockRepository;
    }

    @Transactional
    public List<UnlockResponse> syncAndList(User user, UserGameStats stats) {
        Set<String> keys = userUnlockRepository.findKeysByUser(user);
        for (UnlockRule rule : RULES) {
            if (!rule.unlockedByDefault()
                    && stats.getLevel() >= rule.requiredLevel()
                    && !keys.contains(rule.key())) {
                userUnlockRepository.save(new UserUnlock(user, rule.key()));
                keys.add(rule.key());
            }
        }

        Map<String, UserUnlock> unlocks = userUnlockRepository.findByUser(user)
                .stream()
                .collect(Collectors.toMap(UserUnlock::getUnlockKey, Function.identity()));

        return RULES.stream()
                .sorted(Comparator.comparing(UnlockRule::type).thenComparingInt(UnlockRule::requiredLevel))
                .map(rule -> toResponse(rule, unlocks.get(rule.key())))
                .toList();
    }

    @Transactional
    public boolean isUnlocked(User user, UserGameStats stats, String type, String targetKey) {
        return syncAndList(user, stats).stream()
                .anyMatch(unlock -> unlock.isUnlocked()
                        && unlock.getType().equals(type)
                        && unlock.getTargetKey().equals(targetKey));
    }

    private UnlockResponse toResponse(UnlockRule rule, UserUnlock unlock) {
        boolean unlocked = rule.unlockedByDefault() || unlock != null;
        LocalDateTime unlockedAt = rule.unlockedByDefault() ? null : unlock == null ? null : unlock.getUnlockedAt();
        return new UnlockResponse(
                rule.key(),
                rule.type(),
                rule.targetKey(),
                rule.title(),
                rule.requiredLevel(),
                unlocked,
                unlockedAt
        );
    }

    private record UnlockRule(
            String key,
            String type,
            String targetKey,
            String title,
            int requiredLevel,
            boolean unlockedByDefault
    ) {
    }
}
