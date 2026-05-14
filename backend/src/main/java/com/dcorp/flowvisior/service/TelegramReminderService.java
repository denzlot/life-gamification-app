package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanItemStatus;
import com.dcorp.flowvisior.entity.TelegramCallbackToken;
import com.dcorp.flowvisior.entity.TelegramReminderType;
import com.dcorp.flowvisior.entity.TelegramSentReminder;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TelegramCallbackTokenRepository;
import com.dcorp.flowvisior.repository.TelegramSentReminderRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TelegramReminderService {

    private static final String CYCLE_TODAY_ACTION = "CYCLE_TODAY";
    private static final int CALLBACK_TOKEN_BYTES = 18;
    private static final int CALLBACK_TTL_HOURS = 6;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final DailyPlanService dailyPlanService;
    private final TelegramBotClient telegramBotClient;
    private final TelegramSentReminderRepository telegramSentReminderRepository;
    private final TelegramCallbackTokenRepository telegramCallbackTokenRepository;

    public TelegramReminderService(
            UserRepository userRepository,
            DailyPlanService dailyPlanService,
            TelegramBotClient telegramBotClient,
            TelegramSentReminderRepository telegramSentReminderRepository,
            TelegramCallbackTokenRepository telegramCallbackTokenRepository
    ) {
        this.userRepository = userRepository;
        this.dailyPlanService = dailyPlanService;
        this.telegramBotClient = telegramBotClient;
        this.telegramSentReminderRepository = telegramSentReminderRepository;
        this.telegramCallbackTokenRepository = telegramCallbackTokenRepository;
    }

    @Scheduled(fixedDelayString = "${telegram.reminders.fixed-delay-ms:60000}")
    @Transactional
    public void sendDueReminders() {
        if (!telegramBotClient.isConfigured()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        telegramCallbackTokenRepository.deleteByExpiresAtBeforeOrUsedAtIsNotNull(now);

        List<User> users = userRepository.findByTelegramChatIdIsNotNullAndTelegramRemindersEnabledTrue();
        for (User user : users) {
            sendDueRemindersForUser(user, now);
        }
    }

    private void sendDueRemindersForUser(User user, LocalDateTime now) {
        if (!user.isTelegramLinked() || !user.isTelegramRemindersEnabled()) {
            return;
        }

        LocalDate today = now.toLocalDate();
        List<DailyPlanItem> items = dailyPlanService.getItemsForExistingUserPlan(user, today)
                .stream()
                .filter(item -> isActualPendingToday(item, today))
                .toList();
        Set<String> sentReminderKeys = sentReminderKeys(user, items);
        for (DailyPlanItem item : items) {
            if (user.isTelegramPlannedRemindersEnabled()) {
                maybeSendReminder(user, item, TelegramReminderType.PLANNED, item.getPlannedTime(), now, sentReminderKeys);
            }
            if (user.isTelegramDeadlineRemindersEnabled()) {
                maybeSendReminder(user, item, TelegramReminderType.DEADLINE, item.getDeadlineTime(), now, sentReminderKeys);
            }
        }
    }

    private Set<String> sentReminderKeys(User user, List<DailyPlanItem> items) {
        List<Long> itemIds = items.stream()
                .map(DailyPlanItem::getId)
                .filter(id -> id != null)
                .toList();
        if (itemIds.isEmpty()) {
            return new HashSet<>();
        }
        return telegramSentReminderRepository.findSentReminderKeys(user, itemIds)
                .stream()
                .map(key -> reminderKey(key.getDailyPlanItemId(), key.getReminderType()))
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));
    }

    private void maybeSendReminder(
            User user,
            DailyPlanItem item,
            TelegramReminderType reminderType,
            LocalTime targetTime,
            LocalDateTime now,
            Set<String> sentReminderKeys
    ) {
        if (targetTime == null) {
            return;
        }

        LocalDateTime targetDateTime = LocalDateTime.of(now.toLocalDate(), targetTime);
        LocalDateTime reminderDateTime = targetDateTime.minusMinutes(15);

        if (now.isBefore(reminderDateTime)) {
            return;
        }

        String reminderKey = reminderKey(item.getId(), reminderType);
        if (sentReminderKeys.contains(reminderKey)) {
            return;
        }

        boolean sent = telegramBotClient.sendMessage(
                user.getTelegramChatId(),
                reminderText(item, reminderType, targetTime),
                completeButton(user, item)
        );

        if (sent) {
            telegramSentReminderRepository.save(new TelegramSentReminder(user, item, reminderType));
            sentReminderKeys.add(reminderKey);
        }
    }

    private boolean isActualPendingToday(DailyPlanItem item, LocalDate today) {
        return item.getStatus() == DailyPlanItemStatus.PENDING
                && item.getDailyPlan().getPlanDate().equals(today)
                && !item.getDailyPlan().isClosed();
    }

    private Map<String, Object> completeButton(User user, DailyPlanItem item) {
        if (item.getSourceType() == ActivitySourceType.MANUAL) {
            return null;
        }

        TelegramCallbackToken token = new TelegramCallbackToken(
                randomNonce(),
                user,
                item,
                CYCLE_TODAY_ACTION,
                LocalDateTime.now().plusHours(CALLBACK_TTL_HOURS)
        );
        telegramCallbackTokenRepository.save(token);

        return Map.of("inline_keyboard", List.of(List.of(Map.of(
                "text", buttonText(item),
                "callback_data", "cycle:" + token.getNonce()
        ))));
    }

    private String reminderText(DailyPlanItem item, TelegramReminderType reminderType, LocalTime targetTime) {
        return "Напоминание: [" + typeLabel(item.getSourceType()) + "] "
                + safeTitle(item.getTitle())
                + "\n"
                + reminderTypeLabel(reminderType) + " "
                + targetTime.format(TIME_FORMAT)
                + "\n"
                + "Статус: в плане";
    }

    private String reminderKey(Long itemId, TelegramReminderType reminderType) {
        return itemId + ":" + reminderType.name();
    }

    private String reminderTypeLabel(TelegramReminderType reminderType) {
        return switch (reminderType) {
            case PLANNED -> "план";
            case DEADLINE -> "дедлайн";
        };
    }

    private String typeLabel(ActivitySourceType type) {
        return switch (type) {
            case TASK -> "задача";
            case HABIT -> "привычка";
            case QUEST -> "квест";
            case MANUAL -> "план";
        };
    }

    private String safeTitle(String title) {
        if (title == null || title.isBlank()) {
            return "Без названия";
        }
        String clean = title.replace('\n', ' ').replace('\r', ' ').trim();
        return clean.length() <= 120 ? clean : clean.substring(0, 119) + "...";
    }

    private String safeTitle(String title, int limit) {
        if (title == null || title.isBlank()) {
            return "Без названия";
        }
        String clean = title.replace('\n', ' ').replace('\r', ' ').trim();
        return clean.length() <= limit ? clean : clean.substring(0, limit - 1) + "...";
    }

    private String buttonText(DailyPlanItem item) {
        return safeTitle(item.getTitle(), 42) + " " + statusIcon(item.getStatus());
    }

    private String statusIcon(DailyPlanItemStatus status) {
        return switch (status) {
            case PENDING -> "\u25cb";
            case COMPLETED -> "\u2713";
            case FAILED -> "\u2715";
        };
    }

    private String randomNonce() {
        byte[] bytes = new byte[CALLBACK_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
