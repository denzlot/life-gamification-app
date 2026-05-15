package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.quest.UpdateQuestStepRequest;
import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStatus;
import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.QuestRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
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
}
