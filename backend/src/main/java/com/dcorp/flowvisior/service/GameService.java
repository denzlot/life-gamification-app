package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.focus.CreateFocusSessionRequest;
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
    private static final int SEVEN_DAY_XP_REWARD = 70;
    private static final int SEVEN_DAY_HP_REWARD = 7;
    private static final int MISSED_DAY_XP_PENALTY = -70;
    private static final int MISSED_DAY_HP_PENALTY = -7;

    private final UserGameStatsRepository userGameStatsRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final ActivityLogRepository activityLogRepository;
    private final QuestStepRepository questStepRepository;
    private final AchievementService achievementService;
    private final FocusSessionService focusSessionService;

    public GameService(
            UserGameStatsRepository userGameStatsRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            ActivityLogRepository activityLogRepository,
            QuestStepRepository questStepRepository,
            AchievementService achievementService,
            FocusSessionService focusSessionService
    ) {
        this.userGameStatsRepository = userGameStatsRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.activityLogRepository = activityLogRepository;
        this.questStepRepository = questStepRepository;
        this.achievementService = achievementService;
        this.focusSessionService = focusSessionService;
    }

    @Transactional
    public void complete(DailyPlanItem item, User user) {
        complete(item, user, null);
    }

    @Transactional
    public void complete(DailyPlanItem item, User user, CreateFocusSessionRequest focusSession) {
        validateEditable(item);

        if (item.getStatus() != DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is not in PENDING status"
            );
        }

        UserGameStats stats = getStats(user);
        QuestStep questStep = getPendingQuestStepForItem(item, user);

        if (focusSession != null) {
            validateFocusSessionForItem(item, focusSession);
            int focusSpentSeconds = focusSession.getCreditedDurationSeconds() == null
                    ? focusSession.getDurationSeconds()
                    : focusSession.getCreditedDurationSeconds();
            item.setFocusSpentSeconds(focusSpentSeconds);
        }

        item.complete();
        dailyPlanItemRepository.save(item);
        completeQuestStep(questStep, item.getDailyPlan().getPlanDate());

        if (focusSession != null) {
            focusSessionService.saveCompletedSession(user, focusSession);
        }

        activityLogRepository.save(new ActivityLog(
                user, item.getDailyPlan(), item,
                ActivityAction.COMPLETED,
                0, 0,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));

        achievementService.checkAndGrant(user);
    }

    @Transactional
    public void fail(DailyPlanItem item, User user) {
        validateEditable(item);

        UserGameStats stats = getStats(user);
        QuestStep questStep = getQuestStepForItem(item, user);

        if (item.getStatus() == DailyPlanItemStatus.COMPLETED) {
            item.reset();
            resetQuestStep(questStep, item.getDailyPlan().getPlanDate());
        } else if (item.getStatus() != DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is not in PENDING status"
            );
        }

        if (questStep != null && questStep.getStatus() != QuestStepStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Quest step is not in PENDING status"
            );
        }

        item.fail();
        dailyPlanItemRepository.save(item);
        postponeQuestStepAfterFailedDay(questStep, item.getDailyPlan().getPlanDate());

        activityLogRepository.save(new ActivityLog(
                user, item.getDailyPlan(), item,
                ActivityAction.FAILED,
                0, 0,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));

        achievementService.checkAndGrant(user);
    }

    @Transactional
    public void reset(DailyPlanItem item, User user) {
        validateEditable(item);

        if (item.getStatus() == DailyPlanItemStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item is already in PENDING status"
            );
        }

        UserGameStats stats = getStats(user);
        QuestStep questStep = getQuestStepForItem(item, user);

        item.reset();
        dailyPlanItemRepository.save(item);
        resetQuestStep(questStep, item.getDailyPlan().getPlanDate());

        activityLogRepository.save(new ActivityLog(
                user,
                item.getDailyPlan(),
                item,
                ActivityAction.RESET,
                0, 0,
                stats.getXp(), stats.getHp(),
                stats.getStreak(), stats.isStreakShield()
        ));

        achievementService.checkAndGrant(user);
    }

    public DayGameDelta applyDayClose(UserGameStats stats, boolean dayWasProductive, LocalDate planDate) {
        int xpBefore = stats.getXp();
        int hpBefore = stats.getHp();
        boolean shieldBefore = stats.isStreakShield();
        boolean shieldUsed = false;

        if (dayWasProductive) {
            LocalDate expectedPrevious = planDate.minusDays(1);
            LocalDate lastProductiveDate = stats.getLastProductiveDate();

            if (lastProductiveDate == null || !lastProductiveDate.equals(expectedPrevious)) {
                stats.setStreak(0);
            }

            stats.setStreak(stats.getStreak() + 1);
            stats.setLastProductiveDate(planDate);

            if (stats.getStreak() % 7 == 0) {
                stats.setStreakShield(true);
                stats.addXp(SEVEN_DAY_XP_REWARD);
                stats.addHp(SEVEN_DAY_HP_REWARD);
            }
        } else {
            if (shieldBefore) {
                stats.setStreakShield(false);
                stats.setLastProductiveDate(planDate);
                shieldUsed = true;
            } else {
                stats.setStreak(0);
                stats.addXp(MISSED_DAY_XP_PENALTY);
                stats.addHp(MISSED_DAY_HP_PENALTY);
            }
        }

        stats.recalculateLevel();

        return new DayGameDelta(
                stats.getXp() - xpBefore,
                stats.getHp() - hpBefore,
                shieldUsed
        );
    }

    // Старый метод оставлен для совместимости вызовов, если они где-то остались.
    public void applyStreakLogic(UserGameStats stats, boolean dayWasProductive) {
        applyDayClose(stats, dayWasProductive, LocalDate.now());
    }


    private void validateFocusSessionForItem(DailyPlanItem item, CreateFocusSessionRequest focusSession) {
        if (focusSession.getSourceType() != item.getSourceType()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Focus session source type does not match item");
        }

        Long itemSourceId = item.getSourceId();
        Long focusSourceId = focusSession.getSourceId();
        if (itemSourceId != null && focusSourceId != null && !itemSourceId.equals(focusSourceId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Focus session source id does not match item");
        }
    }

    private void validateEditable(DailyPlanItem item) {
        if (item.getDailyPlan().isClosed()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, CLOSED_PLAN_ERROR
            );
        }

        if (item.getDailyPlan().getPlanDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Past daily plan items are read-only"
            );
        }

        if (item.getDailyPlan().getPlanDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Future daily plan items cannot be confirmed yet"
            );
        }
    }

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
        if (item.getSourceType() != ActivitySourceType.QUEST || item.getSourceId() == null) {
            return null;
        }

        return questStepRepository.findByIdAndQuest_User(item.getSourceId(), user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Quest step not found"
                ));
    }

    private void completeQuestStep(QuestStep questStep, LocalDate planDate) {
        if (questStep == null) {
            return;
        }

        restoreQuestStepDate(questStep, planDate);
        questStep.complete();

        boolean hasIncompleteSteps = questStepRepository.existsByQuestAndStatusNot(
                questStep.getQuest(),
                QuestStepStatus.COMPLETED
        );

        if (!hasIncompleteSteps) {
            questStep.getQuest().complete();
        }
    }

    private void restoreQuestStepDate(QuestStep questStep, LocalDate planDate) {
        if (questStep == null || planDate == null || planDate.equals(questStep.getScheduledDate())) {
            return;
        }

        questStep.update(
                questStep.getTitle(),
                questStep.getDescription(),
                planDate,
                questStep.getPlannedTime(),
                questStep.getDeadlineTime()
        );
    }

    private void postponeQuestStepAfterFailedDay(QuestStep questStep, LocalDate failedPlanDate) {
        if (questStep == null) {
            return;
        }

        questStep.update(
                questStep.getTitle(),
                questStep.getDescription(),
                failedPlanDate.plusDays(1),
                questStep.getPlannedTime(),
                questStep.getDeadlineTime()
        );
    }

    private void resetQuestStep(QuestStep questStep, LocalDate planDate) {
        if (questStep == null) {
            return;
        }

        restoreQuestStepDate(questStep, planDate);
        questStep.reset();

        if (questStep.getQuest().getStatus() == QuestStatus.COMPLETED) {
            questStep.getQuest().activate();
        }
    }

    public static final class DayGameDelta {
        private final int xpDelta;
        private final int hpDelta;
        private final boolean shieldUsed;

        private DayGameDelta(int xpDelta, int hpDelta, boolean shieldUsed) {
            this.xpDelta = xpDelta;
            this.hpDelta = hpDelta;
            this.shieldUsed = shieldUsed;
        }

        public int getXpDelta() { return xpDelta; }
        public int getHpDelta() { return hpDelta; }
        public boolean isShieldUsed() { return shieldUsed; }
    }
}
