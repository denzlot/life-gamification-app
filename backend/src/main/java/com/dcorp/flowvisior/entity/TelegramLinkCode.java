package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "telegram_link_codes",
        indexes = {
                @Index(name = "idx_telegram_link_codes_code_hash", columnList = "code_hash", unique = true)
        }
)
public class TelegramLinkCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "code_hash", nullable = false, unique = true, length = 128)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected TelegramLinkCode() {
    }

    public TelegramLinkCode(User user, String codeHash, LocalDateTime expiresAt) {
        this.user = user;
        this.codeHash = codeHash;
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

    public User getUser() { return user; }
}
