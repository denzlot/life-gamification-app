package com.dcorp.flowvisior.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Component
public class TelegramBotClient {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotClient.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String botToken;

    public TelegramBotClient(
            @Value("${telegram.bot.token:}") String botToken
    ) {
        this.objectMapper = new ObjectMapper();
        this.botToken = botToken;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public boolean isConfigured() {
        return botToken != null && !botToken.isBlank();
    }

    public boolean sendMessage(Long chatId, String text) {
        return sendMessage(chatId, text, null);
    }

    public boolean sendMessage(Long chatId, String text, Map<String, Object> replyMarkup) {
        if (!isConfigured() || chatId == null) {
            return false;
        }

        Map<String, Object> payload = replyMarkup == null
                ? Map.of("chat_id", chatId, "text", text)
                : Map.of("chat_id", chatId, "text", text, "reply_markup", replyMarkup);

        return callTelegram("sendMessage", payload);
    }

    public boolean editMessageText(Long chatId, Long messageId, String text, Map<String, Object> replyMarkup) {
        if (!isConfigured() || chatId == null || messageId == null) {
            return false;
        }

        Map<String, Object> payload = replyMarkup == null
                ? Map.of("chat_id", chatId, "message_id", messageId, "text", text)
                : Map.of("chat_id", chatId, "message_id", messageId, "text", text, "reply_markup", replyMarkup);

        return callTelegram("editMessageText", payload);
    }

    public boolean answerCallbackQuery(String callbackQueryId, String text) {
        if (!isConfigured() || callbackQueryId == null || callbackQueryId.isBlank()) {
            return false;
        }

        return callTelegram("answerCallbackQuery", Map.of(
                "callback_query_id", callbackQueryId,
                "text", text,
                "show_alert", false
        ));
    }

    public JsonNode getUpdates(long offset, int timeoutSeconds) {
        if (!isConfigured()) {
            return objectMapper.createObjectNode().put("ok", false);
        }

        String uri = "https://api.telegram.org/bot" + botToken
                + "/getUpdates?timeout=" + Math.max(1, timeoutSeconds)
                + "&offset=" + Math.max(0, offset)
                + "&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D";
        return callTelegramGet(uri, Math.max(5, timeoutSeconds + 5));
    }

    public boolean deleteWebhook(boolean dropPendingUpdates) {
        if (!isConfigured()) {
            return false;
        }

        String uri = "https://api.telegram.org/bot" + botToken
                + "/deleteWebhook?drop_pending_updates=" + dropPendingUpdates;
        JsonNode response = callTelegramGet(uri, 10);
        return response.path("ok").asBoolean(false);
    }

    private boolean callTelegram(String method, Map<String, Object> payload) {
        try {
            String requestBody = toJson(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.telegram.org/bot" + botToken + "/" + method))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            boolean successful = response.statusCode() >= 200
                    && response.statusCode() < 300
                    && objectMapper.readTree(response.body()).path("ok").asBoolean(false);
            if (!successful) {
                log.warn("Telegram API call failed: method={}, status={}", method, response.statusCode());
            }
            return successful;

        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            log.warn("Telegram API call failed: method={}", method, exception);
            return false;
        }
    }

    private JsonNode callTelegramGet(String uri, int timeoutSeconds) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(uri))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Telegram API GET failed: status={}", response.statusCode());
                return objectMapper.createObjectNode()
                        .put("ok", false)
                        .put("status", response.statusCode());
            }

            return objectMapper.readTree(response.body());

        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            log.warn("Telegram API GET failed", exception);

            return objectMapper.createObjectNode()
                    .put("ok", false)
                    .put("error", exception.getMessage());
        }
    }

    private String toJson(Map<String, Object> payload) throws JsonProcessingException {
        return objectMapper.writeValueAsString(payload);
    }
}
