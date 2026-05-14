package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanItemStatus;
import com.dcorp.flowvisior.entity.DailyPlanStatus;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.DailyPlanRepository;
import com.dcorp.flowvisior.repository.HabitRepository;
import com.dcorp.flowvisior.repository.QuestStepRepository;
import com.dcorp.flowvisior.repository.TaskRepository;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyPlanServiceTest {

    @Mock
    private DailyPlanRepository dailyPlanRepository;

    @Mock
    private DailyPlanItemRepository dailyPlanItemRepository;

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private AuthenticatedUserService authenticatedUserService;

    @Mock
    private GameService gameService;

    @Mock
    private UserGameStatsRepository userGameStatsRepository;

    @Mock
    private ActivityLogRepository activityLogRepository;

    @Mock
    private QuestStepRepository questStepRepository;

    @Mock
    private AchievementService achievementService;

    @Test
    void telegramStatusCycleCompletesPendingTaskItem() {
        User user = user("owner", 1L);
        DailyPlanItem item = item(user, ActivitySourceType.TASK);

        DailyPlanItemStatus status = service().cycleItemStatusFromTelegram(user, item, LocalDate.now());

        assertThat(status).isEqualTo(DailyPlanItemStatus.COMPLETED);
        verify(gameService).complete(item, user);
    }

    @Test
    void telegramStatusCycleRejectsItemsOwnedByAnotherUser() {
        User owner = user("owner", 1L);
        User attacker = user("attacker", 2L);
        DailyPlanItem item = item(owner, ActivitySourceType.TASK);

        assertThatThrownBy(() -> service().cycleItemStatusFromTelegram(attacker, item, LocalDate.now()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Item not found");

        verifyNoInteractions(gameService);
    }

    @Test
    void telegramStatusCycleRejectsManualItems() {
        User user = user("owner", 1L);
        DailyPlanItem item = item(user, ActivitySourceType.MANUAL);

        assertThatThrownBy(() -> service().cycleItemStatusFromTelegram(user, item, LocalDate.now()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("This action is not allowed");

        verifyNoInteractions(gameService);
    }

    @Test
    void autoCloseOverduePlansClosesStalePlannedPlanWithoutGameDelta() {
        LocalDate today = LocalDate.now();
        User user = user("owner", 1L);
        DailyPlan planned = new DailyPlan(user, today.minusDays(1), DailyPlanStatus.PLANNED);
        DailyPlanItem completed = item(planned, ActivitySourceType.TASK);
        DailyPlanItem pending = item(planned, ActivitySourceType.HABIT);
        completed.complete();

        when(dailyPlanRepository.findByUserAndStatusAndPlanDateLessThanEqualOrderByPlanDateAsc(
                user, DailyPlanStatus.ACTIVE, today
        )).thenReturn(List.of());
        when(dailyPlanRepository.findByUserAndStatusAndPlanDateLessThanEqualOrderByPlanDateAsc(
                user, DailyPlanStatus.PLANNED, today.minusDays(1)
        )).thenReturn(List.of(planned));
        when(dailyPlanItemRepository.findByDailyPlanOrderByCreatedAtAsc(planned))
                .thenReturn(List.of(completed, pending));

        service().autoCloseOverduePlans(user);

        assertThat(planned.isClosed()).isTrue();
        assertThat(planned.getCompletedCount()).isEqualTo(1);
        assertThat(planned.getFailedCount()).isZero();
        assertThat(planned.getTotalCountAtClose()).isEqualTo(2);
        assertThat(planned.getCompletionRateAtClose()).isZero();
        assertThat(planned.getDayQuality()).isEqualTo(com.dcorp.flowvisior.entity.DayQuality.EMPTY);
        assertThat(planned.getXpEarned()).isZero();
        assertThat(planned.getHpDelta()).isZero();
        verify(dailyPlanRepository).save(planned);
        verifyNoInteractions(gameService, userGameStatsRepository, activityLogRepository, achievementService);
    }

    @Test
    void getItemsForExistingUserPlanDoesNotCreateMissingPlan() {
        LocalDate today = LocalDate.now();
        User user = user("owner", 1L);

        when(dailyPlanRepository.findByUserAndStatusAndPlanDateLessThanEqualOrderByPlanDateAsc(
                user, DailyPlanStatus.ACTIVE, today
        )).thenReturn(List.of());
        when(dailyPlanRepository.findByUserAndStatusAndPlanDateLessThanEqualOrderByPlanDateAsc(
                user, DailyPlanStatus.PLANNED, today.minusDays(1)
        )).thenReturn(List.of());
        when(dailyPlanRepository.findByUserAndPlanDate(user, today)).thenReturn(Optional.empty());

        List<DailyPlanItem> items = service().getItemsForExistingUserPlan(user, today);

        assertThat(items).isEmpty();
        verify(dailyPlanRepository, never()).save(org.mockito.ArgumentMatchers.any(DailyPlan.class));
        verifyNoInteractions(dailyPlanItemRepository);
    }

    private DailyPlanService service() {
        return new DailyPlanService(
                dailyPlanRepository,
                dailyPlanItemRepository,
                habitRepository,
                taskRepository,
                authenticatedUserService,
                gameService,
                userGameStatsRepository,
                activityLogRepository,
                questStepRepository,
                achievementService
        );
    }

    private User user(String username, Long id) {
        User user = new User(username, "{noop}password");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private DailyPlanItem item(User user, ActivitySourceType sourceType) {
        DailyPlan dailyPlan = new DailyPlan(user, LocalDate.now(), DailyPlanStatus.ACTIVE);
        return item(dailyPlan, sourceType);
    }

    private DailyPlanItem item(DailyPlan dailyPlan, ActivitySourceType sourceType) {
        return new DailyPlanItem(dailyPlan, sourceType, 10L, "Item", 0, 0, 0);
    }
}
