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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

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
        return new DailyPlanItem(dailyPlan, sourceType, 10L, "Item", 0, 0, 0);
    }
}
