package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "telegram_sent_reminders",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_telegram_sent_reminders_item_type",
                        columnNames = {"user_id", "daily_plan_item_id", "reminder_type"}
                )
        }
)
public class TelegramSentReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "daily_plan_item_id", nullable = false)
    private DailyPlanItem dailyPlanItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "reminder_type", nullable = false, length = 20)
    private TelegramReminderType reminderType;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    protected TelegramSentReminder() {
    }

    public TelegramSentReminder(User user, DailyPlanItem dailyPlanItem, TelegramReminderType reminderType) {
        this.user = user;
        this.dailyPlanItem = dailyPlanItem;
        this.reminderType = reminderType;
    }

    @PrePersist
    void onCreate() {
        this.sentAt = LocalDateTime.now();
    }
}
