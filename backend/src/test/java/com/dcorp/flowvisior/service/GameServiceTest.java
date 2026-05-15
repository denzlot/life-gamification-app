package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;
import com.dcorp.flowvisior.entity.DayQuality;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock
    private UserGameStatsRepository userGameStatsRepository;

    @Mock
    private DailyPlanItemRepository dailyPlanItemRepository;

    @Mock
    private ActivityLogRepository activityLogRepository;

    @Mock
    private QuestStepRepository questStepRepository;

    @Mock
    private AchievementService achievementService;

    @Mock
    private FocusSessionService focusSessionService;

    @Test
    void productiveSeventhDayGrantsShieldAndStreakReward() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setStreak(6);
        stats.setHp(90);
        stats.setLastProductiveDate(today.minusDays(1));

        GameService.DayGameDelta delta = service().applyDayClose(stats, DayQuality.NORMAL, today, 2);

        assertThat(stats.getStreak()).isEqualTo(7);
        assertThat(stats.isStreakShield()).isTrue();
        assertThat(stats.getXp()).isEqualTo(100);
        assertThat(stats.getHp()).isEqualTo(100);
        assertThat(delta.getXpDelta()).isEqualTo(100);
        assertThat(delta.getHpDelta()).isEqualTo(10);
        assertThat(delta.isShieldUsed()).isFalse();
    }

    @Test
    void missedDayWithShieldConsumesShieldAndKeepsStreak() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setStreak(7);
        stats.setStreakShield(true);
        stats.setLastProductiveDate(today.minusDays(1));

        GameService.DayGameDelta delta = service().applyDayClose(stats, DayQuality.EMPTY, today, 3);

        assertThat(stats.getStreak()).isEqualTo(7);
        assertThat(stats.isStreakShield()).isFalse();
        assertThat(stats.getXp()).isZero();
        assertThat(stats.getHp()).isEqualTo(100);
        assertThat(delta.getXpDelta()).isZero();
        assertThat(delta.getHpDelta()).isZero();
        assertThat(delta.isShieldUsed()).isTrue();
    }

    @Test
    void missedDayWithoutShieldResetsStreakAndAppliesStreakPenalty() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setStreak(5);
        stats.setHp(10);
        stats.addXp(100);

        GameService.DayGameDelta delta = service().applyDayClose(stats, DayQuality.EMPTY, today, 3);

        assertThat(stats.getStreak()).isZero();
        assertThat(stats.getXp()).isEqualTo(100);
        assertThat(stats.getHp()).isZero();
        assertThat(delta.getXpDelta()).isZero();
        assertThat(delta.getHpDelta()).isEqualTo(-10);
        assertThat(delta.isShieldUsed()).isFalse();
    }

    @Test
    void missedEmptyDayWithoutPlannedItemsAppliesSmallPenalty() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setHp(20);

        GameService.DayGameDelta delta = service().applyDayClose(stats, DayQuality.EMPTY, today, 0);

        assertThat(stats.getStreak()).isZero();
        assertThat(stats.getXp()).isZero();
        assertThat(stats.getHp()).isEqualTo(15);
        assertThat(delta.getXpDelta()).isZero();
        assertThat(delta.getHpDelta()).isEqualTo(-5);
        assertThat(delta.isShieldUsed()).isFalse();
    }

    @Test
    void badDayContinuesStreakWithSmallHpPenalty() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setStreak(1);
        stats.setHp(20);
        stats.setLastProductiveDate(today.minusDays(1));

        GameService.DayGameDelta delta = service().applyDayClose(stats, DayQuality.BAD, today, 3);

        assertThat(stats.getStreak()).isEqualTo(2);
        assertThat(stats.getXp()).isEqualTo(80);
        assertThat(stats.getHp()).isEqualTo(17);
        assertThat(delta.getXpDelta()).isEqualTo(80);
        assertThat(delta.getHpDelta()).isEqualTo(-3);
        assertThat(delta.isShieldUsed()).isFalse();
    }

    @Test
    void goodDayGrantsSmallXpRewardWithoutHealingHp() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setStreak(1);
        stats.setHp(50);
        stats.setLastProductiveDate(today.minusDays(1));

        GameService.DayGameDelta delta = service().applyDayClose(stats, DayQuality.GOOD, today, 5);

        assertThat(stats.getStreak()).isEqualTo(2);
        assertThat(stats.getXp()).isEqualTo(115);
        assertThat(stats.getHp()).isEqualTo(50);
        assertThat(delta.getXpDelta()).isEqualTo(115);
        assertThat(delta.getHpDelta()).isZero();
        assertThat(delta.isShieldUsed()).isFalse();
    }

    @Test
    void nonConsecutiveProductiveDayStartsNewStreak() {
        UserGameStats stats = stats();
        LocalDate today = LocalDate.of(2026, 5, 5);
        stats.setStreak(5);
        stats.setLastProductiveDate(today.minusDays(3));

        service().applyDayClose(stats, DayQuality.NORMAL, today, 2);

        assertThat(stats.getStreak()).isEqualTo(1);
        assertThat(stats.isStreakShield()).isFalse();
        assertThat(stats.getLastProductiveDate()).isEqualTo(today);
    }

    private GameService service() {
        return new GameService(
                userGameStatsRepository,
                dailyPlanItemRepository,
                activityLogRepository,
                questStepRepository,
                achievementService,
                focusSessionService
        );
    }

    private UserGameStats stats() {
        return new UserGameStats(new User("user", "{noop}password"));
    }
}
