package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanItemStatus;
import com.dcorp.flowvisior.entity.TelegramCallbackToken;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TelegramCallbackTokenRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
public class TelegramUpdateService {

    private static final String CYCLE_TODAY_ACTION = "CYCLE_TODAY";
    private static final int CALLBACK_TOKEN_BYTES = 18;
    private static final int CALLBACK_TTL_HOURS = 6;
    private static final int TITLE_LIMIT = 120;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final Pattern CALLBACK_NONCE_PATTERN = Pattern.compile("[A-Za-z0-9_-]{16,64}");
    private static final String CALLBACK_UNAVAILABLE = "This action is no longer available.";

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final DailyPlanService dailyPlanService;
    private final TelegramLinkService telegramLinkService;
    private final TelegramBotClient telegramBotClient;
    private final TelegramCallbackTokenRepository telegramCallbackTokenRepository;

    public TelegramUpdateService(
            UserRepository userRepository,
            DailyPlanService dailyPlanService,
            TelegramLinkService telegramLinkService,
            TelegramBotClient telegramBotClient,
            TelegramCallbackTokenRepository telegramCallbackTokenRepository
    ) {
        this.userRepository = userRepository;
        this.dailyPlanService = dailyPlanService;
        this.telegramLinkService = telegramLinkService;
        this.telegramBotClient = telegramBotClient;
        this.telegramCallbackTokenRepository = telegramCallbackTokenRepository;
    }

    @Transactional
    public void handleUpdate(JsonNode update) {
        JsonNode callbackQuery = update.path("callback_query");
        if (!callbackQuery.isMissingNode() && !callbackQuery.isNull()) {
            handleCallback(callbackQuery);
            return;
        }

        JsonNode message = update.path("message");
        if (message.isMissingNode() || message.isNull()) {
            return;
        }

        Long chatId = extractPrivateChatId(message);
        if (chatId == null) {
            rejectNonPrivateStart(message);
            return;
        }

        String text = message.path("text").asText("").trim();
        if (text.isBlank()) {
            sendHelp(chatId);
            return;
        }

        handleCommand(chatId, text);
    }

    private void handleCommand(Long chatId, String text) {
        String[] parts = text.split("\\s+", 2);
        String command = parts[0].split("@", 2)[0].toLowerCase(Locale.ROOT);
        String argument = parts.length > 1 ? parts[1].trim() : "";

        switch (command) {
            case "/start" -> handleStart(chatId, argument);
            case "/today" -> withLinkedUser(chatId, user -> sendPlan(chatId, user, LocalDate.now(), true));
            case "/tomorrow" -> withLinkedUser(chatId, user -> sendPlan(chatId, user, LocalDate.now().plusDays(1), false));
            case "/status" -> withLinkedUser(chatId, user -> telegramBotClient.sendMessage(chatId, statusText(user)));
            case "/help" -> sendHelp(chatId);
            case "/unlink" -> withLinkedUser(chatId, user -> {
                telegramLinkService.unlink(user);
                telegramBotClient.sendMessage(chatId, "Telegram has been unlinked from your account.");
            });
            default -> sendHelp(chatId);
        }
    }

    private void handleStart(Long chatId, String linkCode) {
        if (linkCode.isBlank()) {
            telegramBotClient.sendMessage(chatId, "Open the app, create a new Telegram link code, then send /start <linkCode> here.");
            sendHelp(chatId);
            return;
        }

        try {
            telegramLinkService.linkByCode(linkCode, chatId);
            telegramBotClient.sendMessage(chatId, "Telegram has been linked. Use /today to see your plan.");
        } catch (ResponseStatusException exception) {
            telegramBotClient.sendMessage(chatId, "Could not link Telegram: " + safeReason(exception));
        }
    }

    private void handleCallback(JsonNode callbackQuery) {
        String callbackQueryId = callbackQuery.path("id").asText(null);
        Long chatId = extractPrivateChatId(callbackQuery.path("message"));
        String data = callbackQuery.path("data").asText("");

        if (chatId == null || !data.startsWith("cycle:")) {
            telegramBotClient.answerCallbackQuery(callbackQueryId, CALLBACK_UNAVAILABLE);
            return;
        }

        User user = userRepository.findByTelegramChatId(chatId).orElse(null);
        if (user == null) {
            telegramBotClient.answerCallbackQuery(callbackQueryId, CALLBACK_UNAVAILABLE);
            return;
        }

        String nonce = data.substring("cycle:".length()).trim();
        if (!CALLBACK_NONCE_PATTERN.matcher(nonce).matches()) {
            telegramBotClient.answerCallbackQuery(callbackQueryId, CALLBACK_UNAVAILABLE);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        TelegramCallbackToken token = telegramCallbackTokenRepository.findByNonce(nonce).orElse(null);
        if (token == null || !token.isAvailable(now) || !CYCLE_TODAY_ACTION.equals(token.getAction())) {
            telegramBotClient.answerCallbackQuery(callbackQueryId, CALLBACK_UNAVAILABLE);
            return;
        }

        if (!Objects.equals(token.getUser().getId(), user.getId())) {
            telegramBotClient.answerCallbackQuery(callbackQueryId, CALLBACK_UNAVAILABLE);
            return;
        }

        try {
            DailyPlanItemStatus status = dailyPlanService.cycleItemStatusFromTelegram(user, token.getDailyPlanItem(), LocalDate.now());
            token.use();
            telegramCallbackTokenRepository.save(token);
            telegramBotClient.answerCallbackQuery(callbackQueryId, "Status: " + statusLabel(status));
            refreshPlanMessage(callbackQuery, chatId, user);
        } catch (ResponseStatusException exception) {
            telegramBotClient.answerCallbackQuery(callbackQueryId, "Task was not found or has already changed.");
        }
    }

    private void sendPlan(Long chatId, User user, LocalDate planDate, boolean includeCompleteButtons) {
        List<DailyPlanItem> items = dailyPlanService.getItemsForUserPlan(user, planDate);
        if (items.isEmpty()) {
            telegramBotClient.sendMessage(chatId, planDate.equals(LocalDate.now())
                    ? "No tasks for today."
                    : "No tasks for the selected day.");
            return;
        }

        Map<String, Object> replyMarkup = includeCompleteButtons
                ? buildCompleteButtons(user, items)
                : null;
        telegramBotClient.sendMessage(chatId, planText(planDate, items), replyMarkup);
    }

    private void refreshPlanMessage(JsonNode callbackQuery, Long chatId, User user) {
        Long messageId = extractMessageId(callbackQuery.path("message"));
        if (messageId == null) {
            return;
        }

        List<DailyPlanItem> items = dailyPlanService.getItemsForUserPlan(user, LocalDate.now());
        telegramBotClient.editMessageText(
                chatId,
                messageId,
                planText(LocalDate.now(), items),
                buildCompleteButtons(user, items)
        );
    }

    private Map<String, Object> buildCompleteButtons(User user, List<DailyPlanItem> items) {
        List<List<Map<String, String>>> keyboard = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            DailyPlanItem item = items.get(i);
            if (!isToggleableFromTelegram(item)) {
                continue;
            }

            TelegramCallbackToken token = new TelegramCallbackToken(
                    randomNonce(),
                    user,
                    item,
                    CYCLE_TODAY_ACTION,
                    LocalDateTime.now().plusHours(CALLBACK_TTL_HOURS)
            );
            telegramCallbackTokenRepository.save(token);

            keyboard.add(List.of(Map.of(
                    "text", buttonText(item),
                    "callback_data", "cycle:" + token.getNonce()
            )));
        }

        return keyboard.isEmpty() ? null : Map.of("inline_keyboard", keyboard);
    }

    private boolean isToggleableFromTelegram(DailyPlanItem item) {
        return item.getSourceType() != ActivitySourceType.MANUAL
                && item.getDailyPlan().getPlanDate().equals(LocalDate.now())
                && !item.getDailyPlan().isClosed();
    }

    private String planText(LocalDate planDate, List<DailyPlanItem> items) {
        StringBuilder text = new StringBuilder();
        text.append(planDate.equals(LocalDate.now()) ? "Today:\n" : "Tomorrow:\n");
        for (int i = 0; i < items.size(); i++) {
            text.append(i + 1)
                    .append(". ")
                    .append(formatItem(items.get(i)))
                    .append("\n");
        }
        return text.toString().trim();
    }

    private String buttonText(DailyPlanItem item) {
        String title = safeTitle(item.getTitle(), 42);
        return title + " " + statusIcon(item.getStatus());
    }

    private String formatItem(DailyPlanItem item) {
        List<String> details = new ArrayList<>();
        if (item.getPlannedTime() != null) {
            details.add("planned " + formatTime(item.getPlannedTime()));
        }
        if (item.getDeadlineTime() != null) {
            details.add("deadline " + formatTime(item.getDeadlineTime()));
        }
        details.add(statusLabel(item.getStatus()));

        return "[" + typeLabel(item.getSourceType()) + "] "
                + safeTitle(item.getTitle())
                + " (" + String.join(", ", details) + ")";
    }

    private String statusText(User user) {
        String linked = user.isTelegramLinked() ? "linked" : "not linked";
        String reminders = user.isTelegramRemindersEnabled() ? "enabled" : "disabled";
        String planned = user.isTelegramPlannedRemindersEnabled() ? "planned time: enabled" : "planned time: disabled";
        String deadline = user.isTelegramDeadlineRemindersEnabled() ? "deadline: enabled" : "deadline: disabled";
        return "Telegram " + linked + ". Reminders " + reminders + ". " + planned + ", " + deadline + ".";
    }

    private void sendHelp(Long chatId) {
        telegramBotClient.sendMessage(chatId, """
                Available commands:
                /start <linkCode> - link Telegram
                /today - today's tasks
                /tomorrow - tomorrow's tasks
                /status - link and reminder status
                /help - help
                /unlink - unlink Telegram
                """.trim());
    }

    private void withLinkedUser(Long chatId, UserConsumer consumer) {
        userRepository.findByTelegramChatId(chatId).ifPresentOrElse(
                consumer::accept,
                () -> telegramBotClient.sendMessage(chatId, "Telegram is not linked. Create a link code in the app and send /start <linkCode>.")
        );
    }

    private Long extractPrivateChatId(JsonNode message) {
        if (!"private".equals(message.path("chat").path("type").asText(""))) {
            return null;
        }
        return extractChatId(message);
    }

    private Long extractChatId(JsonNode message) {
        JsonNode id = message.path("chat").path("id");
        return id.canConvertToLong() ? id.asLong() : null;
    }

    private void rejectNonPrivateStart(JsonNode message) {
        String text = message.path("text").asText("").trim().toLowerCase(Locale.ROOT);
        Long chatId = extractChatId(message);
        if (chatId != null && text.startsWith("/start")) {
            telegramBotClient.sendMessage(chatId, "Please open a private chat with this bot to link your account.");
        }
    }

    private String safeReason(ResponseStatusException exception) {
        return exception.getReason() == null || exception.getReason().isBlank()
                ? "link code is invalid or expired"
                : exception.getReason();
    }

    private String safeTitle(String title) {
        if (title == null || title.isBlank()) {
            return "Untitled";
        }
        String clean = title.replace('\n', ' ').replace('\r', ' ').trim();
        return clean.length() <= TITLE_LIMIT ? clean : clean.substring(0, TITLE_LIMIT - 1) + "...";
    }

    private String safeTitle(String title, int limit) {
        if (title == null || title.isBlank()) {
            return "Untitled";
        }
        String clean = title.replace('\n', ' ').replace('\r', ' ').trim();
        return clean.length() <= limit ? clean : clean.substring(0, limit - 1) + "...";
    }

    private String typeLabel(ActivitySourceType type) {
        return switch (type) {
            case TASK -> "task";
            case HABIT -> "habit";
            case QUEST -> "quest";
            case MANUAL -> "plan";
        };
    }

    private String statusLabel(DailyPlanItemStatus status) {
        return switch (status) {
            case PENDING -> "pending";
            case COMPLETED -> "completed";
            case FAILED -> "failed";
        };
    }

    private String statusIcon(DailyPlanItemStatus status) {
        return switch (status) {
            case PENDING -> "\u25cb";
            case COMPLETED -> "\u2713";
            case FAILED -> "\u2715";
        };
    }

    private String formatTime(LocalTime time) {
        return time.format(TIME_FORMAT);
    }

    private String randomNonce() {
        byte[] bytes = new byte[CALLBACK_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private Long extractMessageId(JsonNode message) {
        JsonNode id = message.path("message_id");
        return id.canConvertToLong() ? id.asLong() : null;
    }

    @FunctionalInterface
    private interface UserConsumer {
        void accept(User user);
    }
}
