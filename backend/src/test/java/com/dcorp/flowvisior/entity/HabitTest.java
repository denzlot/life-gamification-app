package com.dcorp.flowvisior.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HabitTest {

    @Test
    void weeklyHabitWorksOnSelectedWeekdays() {
        Habit habit = new Habit(user(), "Run", null, null, null, HabitScheduleType.WEEKLY, List.of(1, 3), null, null, null);

        assertThat(habit.worksOn(LocalDate.of(2026, 5, 18))).isTrue();
        assertThat(habit.worksOn(LocalDate.of(2026, 5, 19))).isFalse();
        assertThat(habit.worksOn(LocalDate.of(2026, 5, 20))).isTrue();
    }

    @Test
    void monthlyHabitUsesLastDayWhenMonthIsShorter() {
        Habit habit = new Habit(user(), "Pay", null, null, null, HabitScheduleType.MONTHLY, List.of(1), 31, null, null);

        assertThat(habit.worksOn(LocalDate.of(2026, 1, 31))).isTrue();
        assertThat(habit.worksOn(LocalDate.of(2026, 2, 28))).isTrue();
        assertThat(habit.worksOn(LocalDate.of(2026, 2, 27))).isFalse();
        assertThat(habit.worksOn(LocalDate.of(2026, 4, 30))).isTrue();
    }

    @Test
    void intervalHabitWorksEveryNDaysFromStartDate() {
        Habit habit = new Habit(user(), "Review", null, null, null, HabitScheduleType.INTERVAL, List.of(1), null, 3, LocalDate.of(2026, 5, 10));

        assertThat(habit.worksOn(LocalDate.of(2026, 5, 9))).isFalse();
        assertThat(habit.worksOn(LocalDate.of(2026, 5, 10))).isTrue();
        assertThat(habit.worksOn(LocalDate.of(2026, 5, 12))).isFalse();
        assertThat(habit.worksOn(LocalDate.of(2026, 5, 13))).isTrue();
    }

    private User user() {
        return new User("user", "{noop}password");
    }
}
