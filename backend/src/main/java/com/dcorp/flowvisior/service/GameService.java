package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@Service
public class GameService {

    private static final String CLOSED_PLAN_ERROR = "Cannot modify items in a closed daily plan";

    private final UserGameStatsRepository userGameStatsRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final ActivityLogRepository activityLogRepository;
    private final QuestStepRepository questStepRepository;

    public GameService(
            UserGameStatsRepository userGameStatsRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            ActivityLogRepository activityLogRepository,
            QuestStepRepository questStepRepository
    ) {
        this.userGameStatsRepository = userGameStatsRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.activityLogRepository = activityLogRepository;
        this.questStepRepository = questStepRepository;
    }

    @Transactional
    public void complete(DailyPlanItem item, User user) {
        if (item.getDailyPlan().isClosed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, CLOSED_PLAN_ERROR
            );
        }

        if (item.getStatus() != DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is not in PENDING status"
            );
        }

        UserGameStats stats = getStats(user);
        // Для привычек и manual-задач тут будет null, это нормально.
        QuestStep questStep = getPendingQuestStepForItem(item, user);

        int xpDelta = item.getXpReward();
        int plannedHpDelta = item.getHpDeltaComplete();
        int hpBefore = stats.getHp();

        item.complete();
        dailyPlanItemRepository.save(item);

        stats.addXp(xpDelta);
        stats.addHp(plannedHpDelta);

        int actualHpDelta = stats.getHp() - hpBefore;

        recalculateLevel(stats);
        userGameStatsRepository.save(stats);
        completeQuestStep(questStep);

        activityLogRepository.save(new ActivityLog(
                user, item.getDailyPlan(), item,
                ActivityAction.COMPLETED,
                xpDelta, actualHpDelta,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));
    }

    @Transactional
    public void fail(DailyPlanItem item, User user) {
        if (item.getDailyPlan().isClosed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, CLOSED_PLAN_ERROR
            );
        }

        if (item.getStatus() != DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is not in PENDING status"
            );
        }

        UserGameStats stats = getStats(user);
        // Если шаг уже закрыт, второй раз его не трогаем.
        QuestStep questStep = getPendingQuestStepForItem(item, user);

        int plannedHpDelta = item.getHpDeltaFail();
        int hpBefore = stats.getHp();

        item.fail();
        dailyPlanItemRepository.save(item);

        stats.addHp(plannedHpDelta);

        int actualHpDelta = stats.getHp() - hpBefore;

        userGameStatsRepository.save(stats);
        skipQuestStep(questStep);

        activityLogRepository.save(new ActivityLog(
                user, item.getDailyPlan(), item,
                ActivityAction.FAILED,
                0, actualHpDelta,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));
    }

    @Transactional
    public void reset(DailyPlanItem item, User user) {
        if (item.getDailyPlan().isClosed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, CLOSED_PLAN_ERROR
            );
        }

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
        // Reset должен откатить не только item дня, но и связанный шаг квеста.
        QuestStep questStep = getQuestStepForItem(item, user);

        // Откатываем изменения обратными значениями
        int xpBefore = stats.getXp();
        int hpBefore = stats.getHp();

        stats.addXp(-lastLog.getXpDelta());
        stats.addHp(-lastLog.getHpDelta());

        int actualXpDelta = stats.getXp() - xpBefore;
        int actualHpDelta = stats.getHp() - hpBefore;

        recalculateLevel(stats);
        userGameStatsRepository.save(stats);

        item.reset();
        dailyPlanItemRepository.save(item);
        resetQuestStep(questStep);

        activityLogRepository.save(new ActivityLog(
                user,
                item.getDailyPlan(),
                item,
                ActivityAction.RESET,
                actualXpDelta, actualHpDelta,
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

    private QuestStep getPendingQuestStepForItem(DailyPlanItem item, User user) {
        QuestStep questStep = getQuestStepForItem(item, user);

        if (questStep != null && questStep.getStatus() != QuestStepStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Quest step is not in PENDING status"
            );
        }

        return questStep;
    }

    private QuestStep getQuestStepForItem(DailyPlanItem item, User user) {
        // Не каждый пункт дня связан с квестом.
        if (item.getSourceType() != ActivitySourceType.QUEST || item.getSourceId() == null) {
            return null;
        }

        return questStepRepository.findByIdAndQuest_User(item.getSourceId(), user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Quest step not found"
                ));
    }

    private void completeQuestStep(QuestStep questStep) {
        if (questStep == null) {
            return;
        }

        questStep.complete();

        // Последний выполненный шаг автоматически закрывает весь квест.
        boolean hasIncompleteSteps = questStepRepository.existsByQuestAndStatusNot(
                questStep.getQuest(),
                QuestStepStatus.COMPLETED
        );

        if (!hasIncompleteSteps) {
            questStep.getQuest().complete();
        }
    }

    private void skipQuestStep(QuestStep questStep) {
        if (questStep == null) {
            return;
        }

        questStep.skip();
    }

    private void resetQuestStep(QuestStep questStep) {
        if (questStep == null) {
            return;
        }

        questStep.reset();

        // Если откатили шаг завершённого квеста, квест снова становится активным.
        if (questStep.getQuest().getStatus() == QuestStatus.COMPLETED) {
            questStep.getQuest().activate();
        }
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
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate lastProductiveDate = stats.getLastProductiveDate();

        if (dayWasProductive) {
            // Reset streak if the consecutive chain is broken (last productive day was not yesterday)
            if (lastProductiveDate == null || !lastProductiveDate.equals(yesterday)) {
                stats.setStreak(0);
            }
            stats.setStreak(stats.getStreak() + 1);
            stats.setLastProductiveDate(today);

            if (stats.getStreak() % 7 == 0) {
                stats.setStreakShield(true);
            }
        } else {
            if (stats.isStreakShield()) {
                stats.setStreakShield(false);
                // Treat the shielded day as "counted" so the next productive day continues the streak
                stats.setLastProductiveDate(today);
                // streak НЕ обнуляется
            } else {
                stats.setStreak(0);
            }
        }
    }

}
