package com.dcorp.flowvisior.service;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class LoginAttemptService {
    private static final int DELAY_START_FAILURES = 3;
    private static final Duration ATTEMPT_TTL = Duration.ofMinutes(15);
    private static final Duration[] BACKOFF_STEPS = {
            Duration.ofSeconds(1),
            Duration.ofSeconds(2),
            Duration.ofSeconds(5),
            Duration.ofSeconds(10),
            Duration.ofSeconds(30)
    };

    private final Clock clock;
    private final Map<LoginAttemptKey, AttemptState> attempts = new ConcurrentHashMap<>();
    private final AtomicInteger cleanupCounter = new AtomicInteger();

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    public void throttle(String username, String ipAddress) {
        Duration delay = currentDelay(username, ipAddress);
        if (delay.isZero()) {
            return;
        }

        try {
            Thread.sleep(delay.toMillis());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }

    public Duration currentDelay(String username, String ipAddress) {
        maybeCleanup();
        AttemptState state = attempts.get(key(username, ipAddress));
        if (state == null || state.isExpired(clock.instant())) {
            return Duration.ZERO;
        }

        int failures = state.failures();
        if (failures < DELAY_START_FAILURES) {
            return Duration.ZERO;
        }

        int step = Math.min(failures - DELAY_START_FAILURES, BACKOFF_STEPS.length - 1);
        return BACKOFF_STEPS[step];
    }

    public void recordFailure(String username, String ipAddress) {
        Instant now = clock.instant();
        attempts.compute(key(username, ipAddress), (ignored, state) -> {
            if (state == null || state.isExpired(now)) {
                return new AttemptState(1, now);
            }
            return new AttemptState(state.failures() + 1, now);
        });
    }

    public void recordSuccess(String username, String ipAddress) {
        attempts.remove(key(username, ipAddress));
    }

    private LoginAttemptKey key(String username, String ipAddress) {
        String normalizedUsername = username == null
                ? ""
                : username.trim().toLowerCase(Locale.ROOT);
        String normalizedIpAddress = ipAddress == null || ipAddress.isBlank()
                ? "unknown"
                : ipAddress.trim();
        return new LoginAttemptKey(normalizedUsername, normalizedIpAddress);
    }

    private void maybeCleanup() {
        if (cleanupCounter.incrementAndGet() % 100 != 0) {
            return;
        }

        Instant now = clock.instant();
        attempts.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
    }

    private record LoginAttemptKey(String username, String ipAddress) {
    }

    private record AttemptState(int failures, Instant lastFailureAt) {
        boolean isExpired(Instant now) {
            return lastFailureAt.plus(ATTEMPT_TTL).isBefore(now);
        }
    }
}
