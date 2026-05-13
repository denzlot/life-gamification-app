package com.dcorp.flowvisior.dto.telegram;

public class TelegramSettingsRequest {
    private boolean remindersEnabled;
    private boolean plannedRemindersEnabled;
    private boolean deadlineRemindersEnabled;

    public boolean isRemindersEnabled() { return remindersEnabled; }
    public boolean isPlannedRemindersEnabled() { return plannedRemindersEnabled; }
    public boolean isDeadlineRemindersEnabled() { return deadlineRemindersEnabled; }
}
