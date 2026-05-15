package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.habit.UpdateHabitRequest;
import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanStatus;
import com.dcorp.flowvisior.entity.Habit;
import com.dcorp.flowvisior.entity.HabitScheduleType;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.DailyPlanRepository;
import com.dcorp.flowvisior.repository.HabitRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HabitServiceTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private DailyPlanRepository dailyPlanRepository;

    @Mock
    private DailyPlanItemRepository dailyPlanItemRepository;

    @Mock
    private AuthenticatedUserService authenticatedUserService;

    @Mock
    private AchievementService achievementService;

    @Test
    void updateAddsHabitToMatchingOpenPlan() {
        LocalDate today = LocalDate.now();
        User user = user();
        Habit habit = habit(user);
        DailyPlan plan = new DailyPlan(user, today, DailyPlanStatus.ACTIVE);
        UpdateHabitRequest request = updateRequest(HabitScheduleType.MONTHLY, null, today.getDayOfMonth(), null, null);

        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(habitRepository.findByIdAndUser(10L, user)).thenReturn(Optional.of(habit));
        when(dailyPlanRepository.findByUserAndStatusInAndPlanDateGreaterThanEqualOrderByPlanDateAsc(
                user, List.of(DailyPlanStatus.ACTIVE, DailyPlanStatus.PLANNED), today
        )).thenReturn(List.of(plan));
        when(dailyPlanItemRepository.findByDailyPlanAndSourceTypeAndSourceId(plan, ActivitySourceType.HABIT, 10L))
                .thenReturn(Optional.empty());

        service().updateHabit(10L, request);

        ArgumentCaptor<DailyPlanItem> itemCaptor = ArgumentCaptor.forClass(DailyPlanItem.class);
        verify(dailyPlanItemRepository).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getDailyPlan()).isEqualTo(plan);
        assertThat(itemCaptor.getValue().getSourceType()).isEqualTo(ActivitySourceType.HABIT);
        assertThat(itemCaptor.getValue().getSourceId()).isEqualTo(10L);
    }

    @Test
    void updateRemovesOnlyPendingOpenItemsThatNoLongerMatchSchedule() {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(1);
        User user = user();
        Habit habit = habit(user);
        DailyPlan todayPlan = new DailyPlan(user, today, DailyPlanStatus.ACTIVE);
        DailyPlan futurePlan = new DailyPlan(user, futureDate, DailyPlanStatus.PLANNED);
        DailyPlanItem completedHistory = item(todayPlan);
        DailyPlanItem pendingFuture = item(futurePlan);
        completedHistory.complete();
        int nonMatchingMonthlyDay = futureDate.getDayOfMonth() == 1 ? 2 : 1;
        UpdateHabitRequest request = updateRequest(HabitScheduleType.MONTHLY, null, nonMatchingMonthlyDay, null, null);

        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        when(habitRepository.findByIdAndUser(10L, user)).thenReturn(Optional.of(habit));
        when(dailyPlanRepository.findByUserAndStatusInAndPlanDateGreaterThanEqualOrderByPlanDateAsc(
                user, List.of(DailyPlanStatus.ACTIVE, DailyPlanStatus.PLANNED), today
        )).thenReturn(List.of(todayPlan, futurePlan));
        when(dailyPlanItemRepository.findByDailyPlanAndSourceTypeAndSourceId(todayPlan, ActivitySourceType.HABIT, 10L))
                .thenReturn(Optional.of(completedHistory));
        when(dailyPlanItemRepository.findByDailyPlanAndSourceTypeAndSourceId(futurePlan, ActivitySourceType.HABIT, 10L))
                .thenReturn(Optional.of(pendingFuture));

        service().updateHabit(10L, request);

        verify(dailyPlanItemRepository).delete(pendingFuture);
        verify(dailyPlanItemRepository, never()).delete(completedHistory);
        verify(dailyPlanItemRepository, never()).save(completedHistory);
    }

    private HabitService service() {
        return new HabitService(
                habitRepository,
                dailyPlanRepository,
                dailyPlanItemRepository,
                authenticatedUserService,
                achievementService
        );
    }

    private User user() {
        User user = new User("owner", "{noop}password");
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private Habit habit(User user) {
        Habit habit = new Habit(user, "Habit", null, null, null, List.of(1, 2, 3, 4, 5, 6, 7));
        ReflectionTestUtils.setField(habit, "id", 10L);
        return habit;
    }

    private DailyPlanItem item(DailyPlan plan) {
        return new DailyPlanItem(plan, ActivitySourceType.HABIT, 10L, "Habit", 0, 0, 0);
    }

    private UpdateHabitRequest updateRequest(
            HabitScheduleType scheduleType,
            List<Integer> scheduleDays,
            Integer monthlyDay,
            Integer intervalDays,
            LocalDate intervalStartDate
    ) {
        UpdateHabitRequest request = new UpdateHabitRequest();
        ReflectionTestUtils.setField(request, "title", "Habit");
        ReflectionTestUtils.setField(request, "scheduleType", scheduleType);
        ReflectionTestUtils.setField(request, "scheduleDays", scheduleDays);
        ReflectionTestUtils.setField(request, "monthlyDay", monthlyDay);
        ReflectionTestUtils.setField(request, "intervalDays", intervalDays);
        ReflectionTestUtils.setField(request, "intervalStartDate", intervalStartDate);
        return request;
    }
}
