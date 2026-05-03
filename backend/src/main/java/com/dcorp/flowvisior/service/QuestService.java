package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.quest.*;
import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.QuestRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class QuestService {

    private final QuestRepository questRepository;
    private final QuestStepRepository questStepRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public QuestService(
            QuestRepository questRepository,
            QuestStepRepository questStepRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.questRepository = questRepository;
        this.questStepRepository = questStepRepository;
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
                request.getDifficulty(),
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

        quest.update(
                request.getTitle(),
                request.getDescription(),
                request.getDifficulty(),
                request.getStatus()
        );

        return new QuestResponse(quest);
    }

    @Transactional
    public void deleteQuest(Long id) {
        User user = authenticatedUserService.getCurrentUser();
        Quest quest = getQuestForUser(id, user);

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

    @Transactional
    public QuestStepResponse updateQuestStep(Long id, UpdateQuestStepRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        QuestStep questStep = questStepRepository.findByIdAndQuest_User(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quest step not found"));

        questStep.update(
                request.getTitle(),
                request.getDescription(),
                request.getScheduledDate()
        );

        return new QuestStepResponse(questStep);
    }

    private Quest getQuestForUser(Long id, User user) {
        return questRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quest not found"));
    }

    private List<QuestStep> generateSteps(Quest quest, CreateQuestRequest request) {
        List<QuestStep> steps = new ArrayList<>();

        for (int stepNumber = 1; stepNumber <= request.getTotalSteps(); stepNumber++) {
            String title = generateStepTitle(request.getBaseStepTitle(), stepNumber);
            LocalDate scheduledDate = calculateScheduledDate(
                    request.getStartDate(),
                    request.getDurationDays(),
                    stepNumber,
                    request.getTotalSteps()
            );

            steps.add(new QuestStep(
                    quest,
                    stepNumber,
                    title,
                    request.getBaseStepDescription(),
                    scheduledDate
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

    private LocalDate calculateScheduledDate(
            LocalDate startDate,
            int durationDays,
            int stepNumber,
            int totalSteps
    ) {
        int offsetDays = (int) (((long) (stepNumber - 1) * durationDays) / totalSteps);

        return startDate.plusDays(offsetDays);
    }
}
