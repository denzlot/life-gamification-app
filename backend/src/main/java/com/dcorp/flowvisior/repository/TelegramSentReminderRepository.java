package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.TelegramReminderType;
import com.dcorp.flowvisior.entity.TelegramSentReminder;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TelegramSentReminderRepository extends JpaRepository<TelegramSentReminder, Long> {
    @Query("""
            select r.dailyPlanItem.id as dailyPlanItemId, r.reminderType as reminderType
            from TelegramSentReminder r
            where r.user = :user and r.dailyPlanItem.id in :itemIds
            """)
    List<SentReminderKey> findSentReminderKeys(
            @Param("user") User user,
            @Param("itemIds") Collection<Long> itemIds
    );

    interface SentReminderKey {
        Long getDailyPlanItemId();
        TelegramReminderType getReminderType();
    }
}
