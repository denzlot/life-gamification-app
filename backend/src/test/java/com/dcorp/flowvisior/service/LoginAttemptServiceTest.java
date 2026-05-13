package com.dcorp.flowvisior.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private final MutableClock clock = new MutableClock();
    private final LoginAttemptService service = new LoginAttemptService(clock);

    @Test
    void delayStartsAfterThirdFailureAndGrows() {
        assertThat(service.currentDelay("Player", "127.0.0.1")).isZero();

        service.recordFailure("Player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");
        assertThat(service.currentDelay("PLAYER", "127.0.0.1")).isZero();

        service.recordFailure("player", "127.0.0.1");
        assertThat(service.currentDelay("player", "127.0.0.1")).isEqualTo(Duration.ofSeconds(1));

        service.recordFailure("player", "127.0.0.1");
        assertThat(service.currentDelay("player", "127.0.0.1")).isEqualTo(Duration.ofSeconds(2));

        service.recordFailure("player", "127.0.0.1");
        assertThat(service.currentDelay("player", "127.0.0.1")).isEqualTo(Duration.ofSeconds(5));
    }

    @Test
    void successClearsFailures() {
        service.recordFailure("player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");

        service.recordSuccess("player", "127.0.0.1");

        assertThat(service.currentDelay("player", "127.0.0.1")).isZero();
    }

    @Test
    void countersAreIsolatedByIpAddress() {
        service.recordFailure("player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");

        assertThat(service.currentDelay("player", "10.0.0.2")).isZero();
    }

    @Test
    void oldFailuresExpire() {
        service.recordFailure("player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");
        service.recordFailure("player", "127.0.0.1");

        clock.advance(Duration.ofMinutes(16));

        assertThat(service.currentDelay("player", "127.0.0.1")).isZero();
    }

    private static final class MutableClock extends Clock {
        private Instant instant = Instant.parse("2026-05-13T12:00:00Z");

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
