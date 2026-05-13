package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "telegram_chat_id")
    private Long telegramChatId;

    @Column(name = "telegram_reminders_enabled", nullable = false)
    private boolean telegramRemindersEnabled;

    @Column(name = "telegram_planned_reminders_enabled", nullable = false)
    private boolean telegramPlannedRemindersEnabled;

    @Column(name = "telegram_deadline_reminders_enabled", nullable = false)
    private boolean telegramDeadlineRemindersEnabled;

    protected User() {
    }

    public User(String username, String password) {
        this.username = username;
        this.password = password;
        this.role = Role.USER;
        this.status = UserStatus.ACTIVE;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void ban() {
        this.status = UserStatus.BANNED;
    }

    public void unban() {
        this.status = UserStatus.ACTIVE;
    }

    public void linkTelegram(Long telegramChatId) {
        this.telegramChatId = telegramChatId;
        this.telegramRemindersEnabled = true;
        this.telegramPlannedRemindersEnabled = true;
        this.telegramDeadlineRemindersEnabled = true;
    }

    public void unlinkTelegram() {
        this.telegramChatId = null;
        this.telegramRemindersEnabled = false;
        this.telegramPlannedRemindersEnabled = false;
        this.telegramDeadlineRemindersEnabled = false;
    }

    public void updateTelegramReminderSettings(
            boolean remindersEnabled,
            boolean plannedRemindersEnabled,
            boolean deadlineRemindersEnabled
    ) {
        this.telegramRemindersEnabled = remindersEnabled;
        this.telegramPlannedRemindersEnabled = plannedRemindersEnabled;
        this.telegramDeadlineRemindersEnabled = deadlineRemindersEnabled;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public Role getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getTelegramChatId() { return telegramChatId; }
    public boolean isTelegramLinked() { return telegramChatId != null; }
    public boolean isTelegramRemindersEnabled() { return telegramRemindersEnabled; }
    public boolean isTelegramPlannedRemindersEnabled() { return telegramPlannedRemindersEnabled; }
    public boolean isTelegramDeadlineRemindersEnabled() { return telegramDeadlineRemindersEnabled; }
}
