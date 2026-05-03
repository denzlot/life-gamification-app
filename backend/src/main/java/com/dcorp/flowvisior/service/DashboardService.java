package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.dashboard.ActiveQuestDashboardResponse;
import com.dcorp.flowvisior.dto.dashboard.DashboardResponse;
import com.dcorp.flowvisior.dto.dashboard.NearestDeadlineResponse;
import com.dcorp.flowvisior.dto.dashboard.TodaySummaryResponse;
import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DashboardService {

    private final AuthenticatedUserService authenticatedUserService;
    private final UserGameStatsService userGameStatsService;
    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final TaskRepository taskRepository;
    private final QuestRepository questRepository;
    private final QuestStepRepository questStepRepository;

    public DashboardService(
            AuthenticatedUserService authenticatedUserService,
            UserGameStatsService userGameStatsService,
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            TaskRepository taskRepository,
            QuestRepository questRepository,
            QuestStepRepository questStepRepository
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.userGameStatsService = userGameStatsService;
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.taskRepository = taskRepository;
        this.questRepository = questRepository;
        this.questStepRepository = questStepRepository;
    }

    @Transactional
    public DashboardResponse getDashboard() {
        User user = authenticatedUserService.getCurrentUser();
        UserGameStats stats = userGameStatsService.getOrCreateFor(user);

        TodaySummaryResponse todaySummary = buildTodaySummary(user);
        List<NearestDeadlineResponse> nearestDeadlines = buildNearestDeadlines(user);
        List<ActiveQuestDashboardResponse> activeQuests = buildActiveQuests(user);

        return new DashboardResponse(
                stats,
                todaySummary,
                nearestDeadlines,
                activeQuests
        );
    }

    private TodaySummaryResponse buildTodaySummary(User user) {
        return dailyPlanRepository.findByUserAndPlanDate(user, LocalDate.now())
                .map(this::buildTodaySummary)
                .orElseGet(TodaySummaryResponse::empty);
    }

    private TodaySummaryResponse buildTodaySummary(DailyPlan dailyPlan) {
        List<DailyPlanItem> items = dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(dailyPlan);

        int completed = countByStatus(items, DailyPlanItemStatus.COMPLETED);
        int failed = countByStatus(items, DailyPlanItemStatus.FAILED);
        int pending = countByStatus(items, DailyPlanItemStatus.PENDING);

        return new TodaySummaryResponse(
                true,
                dailyPlan.getStatus(),
                completed,
                failed,
                pending,
                items.size()
        );
    }

    private int countByStatus(List<DailyPlanItem> items, DailyPlanItemStatus status) {
        return (int) items.stream()
                .filter(item -> item.getStatus() == status)
                .count();
    }

    private List<NearestDeadlineResponse> buildNearestDeadlines(User user) {
        return taskRepository
                .findTop5ByUserAndStatusAndDeadlineDateIsNotNullOrderByDeadlineDateAsc(
                        user,
                        TaskStatus.TODO
                )
                .stream()
                .map(NearestDeadlineResponse::new)
                .toList();
    }

    private List<ActiveQuestDashboardResponse> buildActiveQuests(User user) {
        return questRepository
                .findTop5ByUserAndStatusOrderByTargetDateAsc(user, QuestStatus.ACTIVE)
                .stream()
                .map(this::buildActiveQuest)
                .toList();
    }

    private ActiveQuestDashboardResponse buildActiveQuest(Quest quest) {
        int totalSteps = questStepRepository.countByQuest(quest);
        int completedSteps = questStepRepository.countByQuestAndStatus(
                quest,
                QuestStepStatus.COMPLETED
        );

        QuestStep nextStep = questStepRepository
                .findFirstByQuestAndStatusOrderByScheduledDateAscStepNumberAsc(
                        quest,
                        QuestStepStatus.PENDING
                )
                .orElse(null);

        return new ActiveQuestDashboardResponse(
                quest,
                completedSteps,
                totalSteps,
                nextStep
        );
    }
}
