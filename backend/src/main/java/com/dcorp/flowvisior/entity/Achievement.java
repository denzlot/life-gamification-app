package com.dcorp.flowvisior.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "achievements")
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String key;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "icon_key", length = 50)
    private String iconKey;

    @Column(nullable = false, length = 20)
    private String category;

    @Column(name = "required_value", nullable = false)
    private int requiredValue;

    @Column(name = "xp_reward", nullable = false)
    private int xpReward;

    protected Achievement() {}

    public Long getId() { return id; }
    public String getKey() { return key; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getIconKey() { return iconKey; }
    public String getCategory() { return category; }
    public int getRequiredValue() { return requiredValue; }
    public int getXpReward() { return xpReward; }
}