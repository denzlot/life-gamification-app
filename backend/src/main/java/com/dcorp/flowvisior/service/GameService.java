package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@Service
public class GameService {

    private final UserGameStatsRepository userGameStatsRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final ActivityLogRepository activityLogRepository;

    public GameService(
            UserGameStatsRepository userGameStatsRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            ActivityLogRepository activityLogRepository
    ) {
        this.userGameStatsRepository = userGameStatsRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.activityLogRepository = activityLogRepository;
    }

    @Transactional
    public void complete(DailyPlanItem item, User user) {
        if (item.getStatus() != DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is not in PENDING status"
            );
        }

        UserGameStats stats = getStats(user);

        int xpDelta = item.getXpReward();
        int hpDelta = item.getHpDeltaComplete();

        item.complete();
        dailyPlanItemRepository.save(item);

        stats.addXp(xpDelta);
        stats.addHp(hpDelta);
        recalculateLevel(stats);
        userGameStatsRepository.save(stats);

        activityLogRepository.save(new ActivityLog(
                user, item.getDailyPlan(), item,
                ActivityAction.COMPLETED,
                xpDelta, hpDelta,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));
    }

    @Transactional
    public void fail(DailyPlanItem item, User user) {
        if (item.getStatus() != DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is not in PENDING status"
            );
        }

        UserGameStats stats = getStats(user);

        int hpDelta = item.getHpDeltaFail();

        item.fail();
        dailyPlanItemRepository.save(item);

        stats.addHp(hpDelta);
        userGameStatsRepository.save(stats);

        activityLogRepository.save(new ActivityLog(
                user, item.getDailyPlan(), item,
                ActivityAction.FAILED,
                0, hpDelta,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));
    }

    @Transactional
    public void reset(DailyPlanItem item, User user) {
        if (item.getStatus() == DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is already in PENDING status"
            );
        }

        // Находим последнюю не-RESET запись для этого item
        ActivityLog lastLog = activityLogRepository
                .findTopByDailyPlanItemAndActionNotOrderByCreatedAtDesc(
                        item, ActivityAction.RESET
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Activity log not found for reset"
                ));

        UserGameStats stats = getStats(user);

        // Откатываем изменения обратными значениями
        stats.addXp(-lastLog.getXpDelta());
        stats.addHp(-lastLog.getHpDelta());
        recalculateLevel(stats);
        userGameStatsRepository.save(stats);

        item.reset();
        dailyPlanItemRepository.save(item);

        activityLogRepository.save(new ActivityLog(
                user,
                item.getDailyPlan(),
                item,
                ActivityAction.RESET,
                -lastLog.getXpDelta(), -lastLog.getHpDelta(),
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));
    }

    // --- вспомогательные методы ---

    private UserGameStats getStats(User user) {
        return userGameStatsRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Game stats not found"
                ));
    }

    private void recalculateLevel(UserGameStats stats) {
        // XP для уровня N = 500 * (N-1) * N / 2
        // Ищем максимальный уровень при котором суммарный XP <= stats.xp
        int level = 1;
        while (true) {
            int xpRequired = 500 * level * (level + 1) / 2;
            if (stats.getXp() < xpRequired) break;
            level++;
        }
        stats.setLevel(level);
    }

    public void applyStreakLogic(UserGameStats stats, boolean dayWasProductive) {
        if (dayWasProductive) {
            stats.setStreak(stats.getStreak() + 1);
            stats.setLastProductiveDate(LocalDate.now());

            if (stats.getStreak() % 7 == 0) {
                stats.setStreakShield(true);
            }
        } else {
            if (stats.isStreakShield()) {
                stats.setStreakShield(false);
                // streak НЕ обнуляется
            } else {
                stats.setStreak(0);
            }
        }
    }

}