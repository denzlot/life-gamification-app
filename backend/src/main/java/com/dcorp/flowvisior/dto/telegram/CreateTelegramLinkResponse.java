package com.dcorp.flowvisior.dto.telegram;

import java.time.LocalDateTime;

public record CreateTelegramLinkResponse(
        String linkCode,
        String deepLink,
        LocalDateTime expiresAt
) {
}
