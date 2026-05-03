package com.dcorp.flowvisior.entity;


import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_game_stats")
public class UserGameStats {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private int xp;

    @Column(nullable = false)
    private int level;

    @Column(nullable = false)
    private int hp;

    @Column(name = "max_hp", nullable = false)
    private int maxHp;

    @Column(nullable = false)
    private int streak;

    @Column(name = "streak_shield", nullable = false)
    private boolean streakShield;

    @Column(name = "last_productive_date")
    private LocalDate lastProductiveDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected UserGameStats() {

    }
    public UserGameStats(User user) {
        this.user = user;
        this.xp = 0;
        this.level = 1;
        this.hp = 100;
        this.maxHp = 100;
        this.streak = 0;
        this.streakShield = false;
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

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public int getXp() {
        return xp;
    }

    public int getLevel() {
        return level;
    }

    public int getHp() {
        return hp;
    }

    public int getMaxHp() {
        return maxHp;
    }

    public int getStreak() {
        return streak;
    }

    public boolean isStreakShield() {
        return streakShield;
    }

    public LocalDate getLastProductiveDate() {
        return lastProductiveDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void addXp(int amount) {
        this.xp = Math.max(0, this.xp + amount);
    }

    public void setHp(int hp) {
        this.hp = Math.max(0, Math.min(hp, this.maxHp));
    }

    public void addHp(int delta) {
        setHp(this.hp + delta);
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public void setStreak(int streak) {
        this.streak = streak;
    }

    public void setStreakShield(boolean streakShield) {
        this.streakShield = streakShield;
    }

    public void setLastProductiveDate(LocalDate date) {
        this.lastProductiveDate = date;
    }
}
