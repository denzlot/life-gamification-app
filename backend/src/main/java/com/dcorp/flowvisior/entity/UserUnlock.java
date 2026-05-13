package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_unlocks",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_unlock", columnNames = {"user_id", "unlock_key"})
        }
)
public class UserUnlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "unlock_key", nullable = false, length = 80)
    private String unlockKey;

    @Column(name = "unlocked_at", nullable = false)
    private LocalDateTime unlockedAt;

    protected UserUnlock() {
    }

    public UserUnlock(User user, String unlockKey) {
        this.user = user;
        this.unlockKey = unlockKey;
        this.unlockedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getUnlockKey() { return unlockKey; }
    public LocalDateTime getUnlockedAt() { return unlockedAt; }
}
