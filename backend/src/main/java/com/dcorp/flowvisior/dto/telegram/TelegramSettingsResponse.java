package com.dcorp.flowvisior.dto.telegram;

import com.dcorp.flowvisior.entity.User;

public record TelegramSettingsResponse(
        boolean linked,
        boolean remindersEnabled,
        boolean plannedRemindersEnabled,
        boolean deadlineRemindersEnabled
) {
    public TelegramSettingsResponse(User user) {
        this(
                user.isTelegramLinked(),
                user.isTelegramRemindersEnabled(),
                user.isTelegramPlannedRemindersEnabled(),
                user.isTelegramDeadlineRemindersEnabled()
        );
    }
}
