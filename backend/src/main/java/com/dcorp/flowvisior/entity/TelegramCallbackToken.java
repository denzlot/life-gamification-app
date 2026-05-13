package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "telegram_callback_tokens",
        indexes = {
                @Index(name = "idx_telegram_callback_tokens_nonce", columnList = "nonce", unique = true)
        }
)
public class TelegramCallbackToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String nonce;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "daily_plan_item_id", nullable = false)
    private DailyPlanItem dailyPlanItem;

    @Column(nullable = false, length = 32)
    private String action;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected TelegramCallbackToken() {
    }

    public TelegramCallbackToken(
            String nonce,
            User user,
            DailyPlanItem dailyPlanItem,
            String action,
            LocalDateTime expiresAt
    ) {
        this.nonce = nonce;
        this.user = user;
        this.dailyPlanItem = dailyPlanItem;
        this.action = action;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public boolean isAvailable(LocalDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public void use() {
        this.usedAt = LocalDateTime.now();
    }

    public String getNonce() { return nonce; }
    public User getUser() { return user; }
    public DailyPlanItem getDailyPlanItem() { return dailyPlanItem; }
    public String getAction() { return action; }
}
