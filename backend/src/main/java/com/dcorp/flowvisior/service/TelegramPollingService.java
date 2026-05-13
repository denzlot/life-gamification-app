package com.dcorp.flowvisior.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class TelegramPollingService {

    private static final Logger log = LoggerFactory.getLogger(TelegramPollingService.class);

    private final TelegramBotClient telegramBotClient;
    private final TelegramUpdateService telegramUpdateService;
    private final boolean enabled;
    private final boolean dropPendingUpdates;
    private final int timeoutSeconds;
    private final AtomicBoolean polling = new AtomicBoolean(false);

    private long nextOffset = 0;

    public TelegramPollingService(
            TelegramBotClient telegramBotClient,
            TelegramUpdateService telegramUpdateService,
            @Value("${telegram.polling.enabled:true}") boolean enabled,
            @Value("${telegram.polling.drop-pending-updates:false}") boolean dropPendingUpdates,
            @Value("${telegram.polling.timeout-seconds:25}") int timeoutSeconds
    ) {
        this.telegramBotClient = telegramBotClient;
        this.telegramUpdateService = telegramUpdateService;
        this.enabled = enabled;
        this.dropPendingUpdates = dropPendingUpdates;
        this.timeoutSeconds = timeoutSeconds;
    }

    @PostConstruct
    public void disableWebhookForPolling() {
        if (enabled && telegramBotClient.isConfigured()) {
            boolean deleted = telegramBotClient.deleteWebhook(dropPendingUpdates);
            log.info("Telegram polling is enabled; deleteWebhook result={}", deleted);
        } else {
            log.info("Telegram polling is disabled or bot token is missing");
        }
    }

    @Scheduled(fixedDelayString = "${telegram.polling.fixed-delay-ms:1000}")
    public void pollUpdates() {
        if (!enabled || !telegramBotClient.isConfigured() || !polling.compareAndSet(false, true)) {
            return;
        }

        try {
            JsonNode response = telegramBotClient.getUpdates(nextOffset, timeoutSeconds);
            if (!response.path("ok").asBoolean(false)) {
                return;
            }

            for (JsonNode update : response.path("result")) {
                long updateId = update.path("update_id").asLong(-1);
                if (updateId >= 0) {
                    nextOffset = Math.max(nextOffset, updateId + 1);
                }
                try {
                    telegramUpdateService.handleUpdate(update);
                } catch (RuntimeException exception) {
                    log.warn("Telegram update handling failed: updateId={}", updateId, exception);
                }
            }
        } finally {
            polling.set(false);
        }
    }

}
