package com.dcorp.flowvisior.service;

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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    @Test
    void deleteQuestArchivesQuestWhenStepIsAlreadyUsedInDailyPlan() {
        User user = new User("user", "{noop}password");
        Quest quest = quest(user);
        QuestStep step = mock(QuestStep.class);

        when(step.getId()).thenReturn(42L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(questRepository.findByIdAndUser(10L, user)).thenReturn(Optional.of(quest));
        when(questStepRepository.findByQuestOrderByStepNumberAsc(quest)).thenReturn(List.of(step));
        when(dailyPlanItemRepository.existsBySourceTypeAndSourceIdIn(ActivitySourceType.QUEST, List.of(42L)))
                .thenReturn(true);

        service().deleteQuest(10L);

        assertThat(quest.getStatus()).isEqualTo(QuestStatus.ARCHIVED);
        verify(questRepository, never()).delete(quest);
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

        verify(questRepository).delete(quest);
    }

    private QuestService service() {
        return new QuestService(
                questRepository,
                questStepRepository,
                dailyPlanItemRepository,
                authenticatedUserService
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
