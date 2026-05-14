package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.quest.CreateQuestRequest;
import com.dcorp.flowvisior.dto.quest.UpdateQuestStepRequest;
import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanStatus;
import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStatus;
import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.QuestStepStatus;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.QuestRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuestServiceTest {

    @Mock
    private QuestRepository questRepository;

    @Mock
    private QuestStepRepository questStepRepository;

    @Mock
    private DailyPlanItemRepository dailyPlanItemRepository;

    @Mock
    private AuthenticatedUserService authenticatedUserService;

    @Mock
    private AchievementService achievementService;

    @Test
    void deleteQuestRejectsQuestWhenStepIsAlreadyUsedInDailyPlan() {
        User user = new User("user", "{noop}password");
        Quest quest = quest(user);
        QuestStep step = mock(QuestStep.class);

        when(step.getId()).thenReturn(42L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questRepository.findByIdAndUser(10L, user)).thenReturn(Optional.of(quest));
        when(questStepRepository.findByQuestOrderByStepNumberAsc(quest)).thenReturn(List.of(step));
        when(dailyPlanItemRepository.existsBySourceTypeAndSourceIdIn(ActivitySourceType.QUEST, List.of(42L)))
                .thenReturn(true);

        assertThatThrownBy(() -> service().deleteQuest(10L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Quest already has daily plan history");

        assertThat(quest.getStatus()).isEqualTo(QuestStatus.ACTIVE);
        verify(questRepository, never()).delete(quest);
        verify(questStepRepository, never()).deleteByQuest(quest);
        verify(dailyPlanItemRepository, never()).deleteBySourceTypeAndSourceIdIn(ActivitySourceType.QUEST, List.of(42L));
    }

    @Test
    void deleteQuestPhysicallyDeletesQuestWhenNoStepIsUsedInDailyPlan() {
        User user = new User("user", "{noop}password");
        Quest quest = quest(user);
        QuestStep step = mock(QuestStep.class);

        when(step.getId()).thenReturn(42L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questRepository.findByIdAndUser(10L, user)).thenReturn(Optional.of(quest));
        when(questStepRepository.findByQuestOrderByStepNumberAsc(quest)).thenReturn(List.of(step));
        when(dailyPlanItemRepository.existsBySourceTypeAndSourceIdIn(ActivitySourceType.QUEST, List.of(42L)))
                .thenReturn(false);

        service().deleteQuest(10L);

        assertThat(quest.getStatus()).isEqualTo(QuestStatus.ACTIVE);
        verify(dailyPlanItemRepository, never()).deleteBySourceTypeAndSourceIdIn(ActivitySourceType.QUEST, List.of(42L));
        verify(questStepRepository).deleteByQuest(quest);
        verify(questRepository).delete(quest);
    }

    @Test
    void deleteQuestWithNoStepsDeletesQuestWithoutCheckingDailyPlanItems() {
        User user = new User("user", "{noop}password");
        Quest quest = quest(user);

        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questRepository.findByIdAndUser(10L, user)).thenReturn(Optional.of(quest));
        when(questStepRepository.findByQuestOrderByStepNumberAsc(quest)).thenReturn(List.of());

        service().deleteQuest(10L);

        verifyNoInteractions(dailyPlanItemRepository);
        verify(questStepRepository).deleteByQuest(quest);
        verify(questRepository).delete(quest);
    }

    @Test
    void updateQuestStepDoesNotExposeStepOwnedByAnotherUser() {
        User user = new User("user", "{noop}password");
        UpdateQuestStepRequest request = mock(UpdateQuestStepRequest.class);

        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questStepRepository.findByIdAndQuest_User(99L, user)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().updateQuestStep(99L, request))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Quest step not found");

        verify(questStepRepository).findByIdAndQuest_User(99L, user);
    }

    @Test
    void updateQuestStepRejectsDateChangeForCompletedStep() {
        User user = new User("user", "{noop}password");
        LocalDate today = LocalDate.now();
        QuestStep step = questStep(user, today, LocalTime.of(9, 0), LocalTime.of(18, 0));
        step.complete();
        UpdateQuestStepRequest request = request(
                "Updated",
                "Updated description",
                today.plusDays(1),
                LocalTime.of(9, 0),
                LocalTime.of(18, 0)
        );

        givenStep(user, step);

        assertThatThrownBy(() -> service().updateQuestStep(42L, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Completed quest step schedule cannot be changed");

        assertThat(step.getScheduledDate()).isEqualTo(today);
        assertThat(step.getPlannedTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(step.getDeadlineTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(step.getStatus()).isEqualTo(QuestStepStatus.COMPLETED);
        verifyNoInteractions(dailyPlanItemRepository);
    }

    @Test
    void updateQuestStepRejectsTimeChangesForCompletedStep() {
        User user = new User("user", "{noop}password");
        LocalDate today = LocalDate.now();
        QuestStep step = questStep(user, today, LocalTime.of(9, 0), LocalTime.of(18, 0));
        step.complete();

        givenStep(user, step);

        assertThatThrownBy(() -> service().updateQuestStep(42L, request(
                "Updated",
                "Updated description",
                today,
                LocalTime.of(10, 0),
                LocalTime.of(18, 0)
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Completed quest step schedule cannot be changed");

        assertThatThrownBy(() -> service().updateQuestStep(42L, request(
                "Updated",
                "Updated description",
                today,
                LocalTime.of(9, 0),
                LocalTime.of(19, 0)
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Completed quest step schedule cannot be changed");

        assertThat(step.getPlannedTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(step.getDeadlineTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(step.getStatus()).isEqualTo(QuestStepStatus.COMPLETED);
        verifyNoInteractions(dailyPlanItemRepository);
    }

    @Test
    void updateQuestStepAllowsTitleAndDescriptionChangeForCompletedStep() {
        User user = new User("user", "{noop}password");
        LocalDate scheduledDate = LocalDate.now();
        LocalTime plannedTime = LocalTime.of(9, 0);
        LocalTime deadlineTime = LocalTime.of(18, 0);
        QuestStep step = questStep(user, scheduledDate, plannedTime, deadlineTime);
        step.complete();
        LocalDateTime completedAt = step.getCompletedAt();

        givenStep(user, step);
        when(dailyPlanItemRepository.findBySourceTypeAndSourceId(ActivitySourceType.QUEST, step.getId()))
                .thenReturn(List.of());

        service().updateQuestStep(42L, request(
                "New title",
                "New description",
                scheduledDate,
                plannedTime,
                deadlineTime
        ));

        assertThat(step.getTitle()).isEqualTo("New title");
        assertThat(step.getDescription()).isEqualTo("New description");
        assertThat(step.getScheduledDate()).isEqualTo(scheduledDate);
        assertThat(step.getPlannedTime()).isEqualTo(plannedTime);
        assertThat(step.getDeadlineTime()).isEqualTo(deadlineTime);
        assertThat(step.getCompletedAt()).isEqualTo(completedAt);
        assertThat(step.getStatus()).isEqualTo(QuestStepStatus.COMPLETED);
    }

    @Test
    void updateQuestStepRejectsMovingPendingStepToPastDate() {
        User user = new User("user", "{noop}password");
        LocalDate today = LocalDate.now();
        QuestStep step = questStep(user, today, null, null);
        UpdateQuestStepRequest request = request(
                "Pending",
                null,
                today.minusDays(1),
                null,
                null
        );

        givenStep(user, step);

        assertThatThrownBy(() -> service().updateQuestStep(42L, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Quest step cannot be scheduled in the past");

        assertThat(step.getScheduledDate()).isEqualTo(today);
        assertThat(step.getStatus()).isEqualTo(QuestStepStatus.PENDING);
        verifyNoInteractions(dailyPlanItemRepository);
    }

    @Test
    void updateQuestStepAllowsMovingPendingStepToTodayOrFutureDate() {
        User user = new User("user", "{noop}password");
        LocalDate today = LocalDate.now();
        QuestStep todayStep = questStep(user, today.plusDays(1), null, null);
        QuestStep futureStep = questStep(user, today, null, null);
        LocalDate todayStepBaseline = todayStep.getBaselineScheduledDate();
        LocalDate futureStepBaseline = futureStep.getBaselineScheduledDate();

        givenStep(user, todayStep);
        when(dailyPlanItemRepository.findBySourceTypeAndSourceId(ActivitySourceType.QUEST, todayStep.getId()))
                .thenReturn(List.of());

        service().updateQuestStep(42L, request("Today", null, today, null, null));

        assertThat(todayStep.getScheduledDate()).isEqualTo(today);
        assertThat(todayStep.getBaselineScheduledDate()).isEqualTo(todayStepBaseline);

        givenStep(user, futureStep);
        when(dailyPlanItemRepository.findBySourceTypeAndSourceId(ActivitySourceType.QUEST, futureStep.getId()))
                .thenReturn(List.of());

        service().updateQuestStep(42L, request("Future", null, today.plusDays(2), null, null));

        assertThat(futureStep.getScheduledDate()).isEqualTo(today.plusDays(2));
        assertThat(futureStep.getBaselineScheduledDate()).isEqualTo(futureStepBaseline);
        assertThat(futureStep.getStatus()).isEqualTo(QuestStepStatus.PENDING);
    }

    @Test
    @SuppressWarnings("unchecked")
    void createQuestSetsBaselineDateToInitialScheduledDate() {
        User user = new User("user", "{noop}password");
        LocalDate startDate = LocalDate.now();
        CreateQuestRequest request = createQuestRequest(startDate, 7, 3);

        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questRepository.save(org.mockito.ArgumentMatchers.any(Quest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service().createQuest(request);

        ArgumentCaptor<List<QuestStep>> captor = ArgumentCaptor.forClass(List.class);
        verify(questStepRepository).saveAll(captor.capture());

        assertThat(captor.getValue()).hasSize(3);
        assertThat(captor.getValue())
                .allSatisfy(step -> assertThat(step.getBaselineScheduledDate()).isEqualTo(step.getScheduledDate()));
    }

    @Test
    void updateQuestStepSynchronizesOpenDailyPlanItemsForPendingStep() {
        User user = new User("user", "{noop}password");
        LocalDate today = LocalDate.now();
        LocalDate newDate = today.plusDays(1);
        QuestStep step = questStep(user, today, LocalTime.of(9, 0), null);
        DailyPlan matchingPlan = new DailyPlan(user, newDate, DailyPlanStatus.ACTIVE);
        DailyPlan oldPlan = new DailyPlan(user, today, DailyPlanStatus.ACTIVE);
        DailyPlanItem matchingItem = new DailyPlanItem(
                matchingPlan,
                ActivitySourceType.QUEST,
                step.getId(),
                "Old title",
                "Old description",
                LocalTime.of(9, 0),
                null,
                0,
                0,
                0
        );
        DailyPlanItem oldItem = new DailyPlanItem(
                oldPlan,
                ActivitySourceType.QUEST,
                step.getId(),
                "Old date item",
                null,
                null,
                null,
                0,
                0,
                0
        );

        givenStep(user, step);
        when(dailyPlanItemRepository.findBySourceTypeAndSourceId(ActivitySourceType.QUEST, step.getId()))
                .thenReturn(List.of(matchingItem, oldItem));

        service().updateQuestStep(42L, request(
                "Synced title",
                "Synced description",
                newDate,
                LocalTime.of(11, 30),
                LocalTime.of(17, 45)
        ));

        assertThat(matchingItem.getTitle()).isEqualTo("Synced title");
        assertThat(matchingItem.getDescription()).isEqualTo("Synced description");
        assertThat(matchingItem.getPlannedTime()).isEqualTo(LocalTime.of(11, 30));
        assertThat(matchingItem.getDeadlineTime()).isEqualTo(LocalTime.of(17, 45));
        verify(dailyPlanItemRepository).deleteAll(List.of(oldItem));
    }

    private QuestService service() {
        return new QuestService(
                questRepository,
                questStepRepository,
                dailyPlanItemRepository,
                authenticatedUserService,
                achievementService
        );
    }

    private Quest quest(User user) {
        return new Quest(
                user,
                "Quest",
                null,
                null,
                null,
                LocalDate.of(2026, 5, 5),
                7,
                3
        );
    }

    private QuestStep questStep(User user, LocalDate scheduledDate, LocalTime plannedTime, LocalTime deadlineTime) {
        return new QuestStep(
                quest(user),
                1,
                "Step",
                "Description",
                scheduledDate,
                plannedTime,
                deadlineTime
        );
    }

    private void givenStep(User user, QuestStep step) {
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questStepRepository.findByIdAndQuest_User(42L, user)).thenReturn(Optional.of(step));
    }

    private UpdateQuestStepRequest request(
            String title,
            String description,
            LocalDate scheduledDate,
            LocalTime plannedTime,
            LocalTime deadlineTime
    ) {
        return new UpdateQuestStepRequest() {
            @Override
            public String getTitle() { return title; }

            @Override
            public String getDescription() { return description; }

            @Override
            public LocalDate getScheduledDate() { return scheduledDate; }

            @Override
            public LocalTime getPlannedTime() { return plannedTime; }

            @Override
            public LocalTime getDeadlineTime() { return deadlineTime; }
        };
    }

    private CreateQuestRequest createQuestRequest(LocalDate startDate, int durationDays, int totalSteps) {
        return new CreateQuestRequest() {
            @Override
            public String getTitle() { return "Quest"; }

            @Override
            public String getDescription() { return "Description"; }

            @Override
            public LocalTime getPlannedTime() { return LocalTime.of(9, 0); }

            @Override
            public LocalTime getDeadlineTime() { return LocalTime.of(18, 0); }

            @Override
            public LocalDate getStartDate() { return startDate; }

            @Override
            public int getDurationDays() { return durationDays; }

            @Override
            public int getTotalSteps() { return totalSteps; }

            @Override
            public String getBaseStepTitle() { return "Step"; }

            @Override
            public String getBaseStepDescription() { return "Step description"; }
        };
    }
}
