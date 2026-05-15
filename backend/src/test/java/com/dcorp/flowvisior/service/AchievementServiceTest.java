package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.achievement.AchievementResponse;
import com.dcorp.flowvisior.entity.Achievement;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserAchievement;
import com.dcorp.flowvisior.entity.UserGameStats;
import com.dcorp.flowvisior.repository.AchievementRepository;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.DailyPlanRepository;
import com.dcorp.flowvisior.repository.FocusSessionRepository;
import com.dcorp.flowvisior.repository.HabitRepository;
import com.dcorp.flowvisior.repository.QuestRepository;
import com.dcorp.flowvisior.repository.TaskRepository;
import com.dcorp.flowvisior.repository.UserAchievementRepository;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    private static final Set<String> REMOVED_CREATION_KEYS = Set.of(
            "first_task_created",
            "first_habit_created",
            "first_quest_created"
    );

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private UserAchievementRepository userAchievementRepository;

    @Mock
    private UserGameStatsRepository userGameStatsRepository;

    @Mock
    private ActivityLogRepository activityLogRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private QuestRepository questRepository;

    @Mock
    private DailyPlanRepository dailyPlanRepository;

    @Mock
    private DailyPlanItemRepository dailyPlanItemRepository;

    @Mock
    private FocusSessionRepository focusSessionRepository;

    @Test
    void removedCreationAchievementsAreNotGrantedEvenWhenEntitiesExist() {
        User user = new User("owner", "{noop}password");
        UserGameStats stats = new UserGameStats(user);
        when(userGameStatsRepository.findByUser(user)).thenReturn(Optional.of(stats));
        when(userAchievementRepository.findUnlockedKeysByUser(user)).thenReturn(Set.of());
        when(achievementRepository.findAllByOrderByIdAsc()).thenReturn(REMOVED_CREATION_KEYS.stream()
                .map(key -> achievement(key, "START", 1, 100))
                .toList());
        when(taskRepository.countByUser(user)).thenReturn(1L);
        when(habitRepository.countByUser(user)).thenReturn(1L);
        when(questRepository.countByUser(user)).thenReturn(1L);
        stubEmptyProgressInputs(user);

        List<String> unlocked = service().checkAndGrant(user);

        assertThat(unlocked).isEmpty();
        verify(userAchievementRepository, never()).save(any(UserAchievement.class));
        verify(userGameStatsRepository, never()).save(any(UserGameStats.class));
    }

    @Test
    void catalogDoesNotContainRemovedCreationAchievementsAfterCleanup() {
        User user = new User("owner", "{noop}password");
        UserGameStats stats = new UserGameStats(user);
        when(userGameStatsRepository.findByUser(user)).thenReturn(Optional.of(stats));
        when(userAchievementRepository.findByUserWithAchievementOrderByUnlockedAtDesc(user)).thenReturn(List.of());
        when(achievementRepository.findAllByOrderByIdAsc()).thenReturn(List.of(
                achievement("tasks_completed_1", "TASKS", 1, 75),
                achievement("habit_completed_1", "HABITS", 1, 75),
                achievement("quest_completed_1", "QUESTS", 1, 250)
        ));
        stubEmptyProgressInputs(user);

        List<String> keys = service().getCatalog(user)
                .stream()
                .map(AchievementResponse::getKey)
                .toList();

        assertThat(keys).doesNotContainAnyElementsOf(REMOVED_CREATION_KEYS);
    }

    private void stubEmptyProgressInputs(User user) {
        when(focusSessionRepository.countByUser(user)).thenReturn(0L);
        when(questRepository.countByUserAndStatus(any(), any())).thenReturn(0);
        when(questRepository.countByUserAndStatusAndTotalStepsGreaterThanEqual(any(), any(), org.mockito.ArgumentMatchers.anyInt())).thenReturn(0);
        when(focusSessionRepository.sumDurationSeconds(user)).thenReturn(0L);
        when(focusSessionRepository.existsByUserAndOvertimeSecondsGreaterThan(user, 0)).thenReturn(false);
        when(dailyPlanRepository.findByUserOrderByPlanDateAsc(user)).thenReturn(List.of());
        when(focusSessionRepository.findByUserOrderByCompletedAtDesc(user)).thenReturn(List.of());
        when(activityLogRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
    }

    private Achievement achievement(String key, String category, int requiredValue, int xpReward) {
        Achievement achievement = newAchievement();
        ReflectionTestUtils.setField(achievement, "id", Math.abs((long) key.hashCode()));
        ReflectionTestUtils.setField(achievement, "key", key);
        ReflectionTestUtils.setField(achievement, "title", key);
        ReflectionTestUtils.setField(achievement, "description", key);
        ReflectionTestUtils.setField(achievement, "category", category);
        ReflectionTestUtils.setField(achievement, "requiredValue", requiredValue);
        ReflectionTestUtils.setField(achievement, "xpReward", xpReward);
        return achievement;
    }

    private Achievement newAchievement() {
        try {
            var constructor = Achievement.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Cannot create achievement test fixture", ex);
        }
    }

    private AchievementService service() {
        return new AchievementService(
                achievementRepository,
                userAchievementRepository,
                userGameStatsRepository,
                activityLogRepository,
                taskRepository,
                habitRepository,
                questRepository,
                dailyPlanRepository,
                dailyPlanItemRepository,
                focusSessionRepository
        );
    }
}
