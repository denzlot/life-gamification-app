package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.quest.*;
import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.QuestStatus;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.QuestRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class QuestService {

    private final QuestRepository questRepository;
    private final QuestStepRepository questStepRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public QuestService(
            QuestRepository questRepository,
            QuestStepRepository questStepRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.questRepository = questRepository;
        this.questStepRepository = questStepRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional(readOnly = true)
    public List<QuestResponse> getQuests() {
        User user = authenticatedUserService.getCurrentUser();

        return questRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(QuestResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public QuestResponse getQuest(Long id) {
        User user = authenticatedUserService.getCurrentUser();
        Quest quest = getQuestForUser(id, user);

        return new QuestResponse(quest);
    }

    @Transactional
    public QuestResponse createQuest(CreateQuestRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Quest quest = new Quest(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                request.getStartDate(),
                request.getDurationDays(),
                request.getTotalSteps()
        );

        Quest savedQuest = questRepository.save(quest);
        questStepRepository.saveAll(generateSteps(savedQuest, request));

        return new QuestResponse(savedQuest);
    }

    @Transactional
    public QuestResponse updateQuest(Long id, UpdateQuestRequest request) {
        User user = authenticatedUserService.getCurrentUser();
        Quest quest = getQuestForUser(id, user);

        QuestStatus requestedStatus = request.getStatus();
        if (requestedStatus == QuestStatus.COMPLETED && quest.getStatus() != QuestStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quest completion is calculated automatically");
        }
        if (quest.getStatus() == QuestStatus.COMPLETED && requestedStatus != QuestStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completed quests cannot be reopened manually");
        }

        quest.update(
                request.getTitle(),
                request.getDescription(),
                request.getPlannedTime(),
                request.getDeadlineTime(),
                requestedStatus
        );

        return new QuestResponse(quest);
    }

    @Transactional
    public void deleteQuest(Long id) {
        User user = authenticatedUserService.getCurrentUser();
        Quest quest = getQuestForUser(id, user);

        List<Long> stepIds = questStepRepository.findByQuestOrderByStepNumberAsc(quest)
                .stream()
                .map(QuestStep::getId)
                .toList();

        boolean hasPlannedHistory = !stepIds.isEmpty()
                && dailyPlanItemRepository.existsBySourceTypeAndSourceIdIn(ActivitySourceType.QUEST, stepIds);

        if (hasPlannedHistory) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Quest already has daily plan history and can only be archived"
            );
        }

        questStepRepository.deleteByQuest(quest);
        questRepository.delete(quest);
    }

    @Transactional(readOnly = true)
    public List<QuestStepResponse> getQuestSteps(Long questId) {
        User user = authenticatedUserService.getCurrentUser();
        Quest quest = getQuestForUser(questId, user);

        return questStepRepository.findByQuestOrderByStepNumberAsc(quest)
                .stream()
                .map(QuestStepResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QuestStepResponse> getActiveQuestSteps() {
        User user = authenticatedUserService.getCurrentUser();

        return questStepRepository.findByQuest_UserAndQuest_StatusOrderByQuest_IdAscStepNumberAsc(user, QuestStatus.ACTIVE)
                .stream()
                .map(QuestStepResponse::new)
                .toList();
    }

    @Transactional
    public QuestStepResponse updateQuestStep(Long id, UpdateQuestStepRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        QuestStep questStep = questStepRepository.findByIdAndQuest_User(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quest step not found"));

        questStep.update(
                request.getTitle(),
                request.getDescription(),
                request.getScheduledDate(),
                request.getPlannedTime(),
                request.getDeadlineTime()
        );

        syncOpenDailyPlanItems(questStep);

        return new QuestStepResponse(questStep);
    }

    private void syncOpenDailyPlanItems(QuestStep questStep) {
        List<DailyPlanItem> items = dailyPlanItemRepository.findBySourceTypeAndSourceId(
                ActivitySourceType.QUEST,
                questStep.getId()
        );
        List<DailyPlanItem> toDelete = new ArrayList<>();

        for (DailyPlanItem item : items) {
            DailyPlan plan = item.getDailyPlan();
            if (plan.isClosed()) {
                continue;
            }
            if (!plan.getPlanDate().equals(questStep.getScheduledDate())) {
                toDelete.add(item);
                continue;
            }
            item.update(
                    questStep.getTitle(),
                    questStep.getDescription(),
                    questStep.getPlannedTime(),
                    questStep.getDeadlineTime()
            );
        }

        if (!toDelete.isEmpty()) {
            dailyPlanItemRepository.deleteAll(toDelete);
        }
    }

    private Quest getQuestForUser(Long id, User user) {
        return questRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quest not found"));
    }

    private List<QuestStep> generateSteps(Quest quest, CreateQuestRequest request) {
        List<QuestStep> steps = new ArrayList<>();

        List<LocalDate> scheduledDates = calculateScheduleDates(
                request.getStartDate(),
                request.getDurationDays(),
                request.getTotalSteps()
        );

        for (int stepNumber = 1; stepNumber <= request.getTotalSteps(); stepNumber++) {
            String title = generateStepTitle(request.getBaseStepTitle(), stepNumber);
            LocalDate scheduledDate = scheduledDates.get(stepNumber - 1);

            steps.add(new QuestStep(
                    quest,
                    stepNumber,
                    title,
                    request.getBaseStepDescription(),
                    scheduledDate,
                    request.getPlannedTime(),
                    request.getDeadlineTime()
            ));
        }

        return steps;
    }

    private String generateStepTitle(String baseStepTitle, int stepNumber) {
        if (stepNumber == 1) {
            return baseStepTitle;
        }

        return baseStepTitle + " " + stepNumber;
    }

    private List<LocalDate> calculateScheduleDates(
            LocalDate startDate,
            int durationDays,
            int totalSteps
    ) {
        int safeDuration = Math.max(1, durationDays);
        int safeSteps = Math.max(1, totalSteps);
        int[] quotas = new int[safeDuration];

        if (safeSteps <= safeDuration) {
            for (int index = 0; index < safeSteps; index++) {
                int offset = safeSteps == 1
                        ? 0
                        : Math.round((float) index * (safeDuration - 1) / (safeSteps - 1));
                quotas[offset] += 1;
            }
        } else {
            for (int offset = 0; offset < safeDuration; offset++) {
                quotas[offset] = 1;
            }

            int extraSteps = safeSteps - safeDuration;
            while (extraSteps > 0) {
                int bestOffset = 0;
                double bestPressure = Double.MAX_VALUE;

                for (int offset = 0; offset < safeDuration; offset++) {
                    double pressure = quotas[offset] / dayWeight(startDate.plusDays(offset));
                    if (pressure < bestPressure) {
                        bestPressure = pressure;
                        bestOffset = offset;
                    }
                }

                quotas[bestOffset] += 1;
                extraSteps--;
            }
        }

        List<LocalDate> dates = new ArrayList<>(safeSteps);
        for (int offset = 0; offset < safeDuration; offset++) {
            for (int count = 0; count < quotas[offset]; count++) {
                dates.add(startDate.plusDays(offset));
            }
        }

        return dates;
    }

    private double dayWeight(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY ? 1.35d : 1.0d;
    }
}
