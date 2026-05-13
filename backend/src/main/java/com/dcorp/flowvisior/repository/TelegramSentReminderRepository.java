package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.TelegramReminderType;
import com.dcorp.flowvisior.entity.TelegramSentReminder;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TelegramSentReminderRepository extends JpaRepository<TelegramSentReminder, Long> {
    boolean existsByUserAndDailyPlanItemAndReminderType(
            User user,
            DailyPlanItem dailyPlanItem,
            TelegramReminderType reminderType
    );
}
