package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanItemStatus;
import com.dcorp.flowvisior.entity.TelegramCallbackToken;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TelegramCallbackTokenRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramUpdateServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DailyPlanService dailyPlanService;

    @Mock
    private TelegramLinkService telegramLinkService;

    @Mock
    private TelegramBotClient telegramBotClient;

    @Mock
    private TelegramCallbackTokenRepository telegramCallbackTokenRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void callbackConsumesTokenAndRefreshesPlanMessage() throws Exception {
        User user = user("owner", 1L);
        DailyPlanItem item = mock(DailyPlanItem.class);
        String nonce = "valid_valid_nonce_123";
        TelegramCallbackToken token = new TelegramCallbackToken(
                nonce,
                user,
                item,
                "CYCLE_TODAY",
                LocalDateTime.now().plusHours(1)
        );

        when(userRepository.findByTelegramChatId(123L)).thenReturn(Optional.of(user));
        when(telegramCallbackTokenRepository.findByNonce(nonce)).thenReturn(Optional.of(token));
        when(dailyPlanService.cycleItemStatusFromTelegram(eq(user), eq(item), any(LocalDate.class)))
                .thenReturn(DailyPlanItemStatus.COMPLETED);
        when(dailyPlanService.getItemsForUserPlan(eq(user), any(LocalDate.class))).thenReturn(List.of());

        service().handleUpdate(objectMapper.readTree("""
                {
                  "callback_query": {
                    "id": "callback-1",
                    "message": {
                      "message_id": 77,
                      "chat": { "id": 123, "type": "private" }
                    },
                    "data": "cycle:valid_valid_nonce_123"
                  }
                }
                """));

        assertThat(token.isAvailable(LocalDateTime.now())).isFalse();
        verify(telegramCallbackTokenRepository).save(token);
        verify(telegramBotClient).answerCallbackQuery("callback-1", "Статус: выполнено");
        verify(telegramBotClient).editMessageText(eq(123L), eq(77L), eq("Сегодня:"), isNull());
    }

    @Test
    void callbackRejectsAlreadyUsedToken() throws Exception {
        User user = user("owner", 1L);
        TelegramCallbackToken token = new TelegramCallbackToken(
                "valid_valid_nonce_123",
                user,
                mock(DailyPlanItem.class),
                "CYCLE_TODAY",
                LocalDateTime.now().plusHours(1)
        );
        token.use();

        when(userRepository.findByTelegramChatId(123L)).thenReturn(Optional.of(user));
        when(telegramCallbackTokenRepository.findByNonce("valid_valid_nonce_123")).thenReturn(Optional.of(token));

        service().handleUpdate(objectMapper.readTree("""
                {
                  "callback_query": {
                    "id": "callback-1",
                    "message": {
                      "message_id": 77,
                      "chat": { "id": 123, "type": "private" }
                    },
                    "data": "cycle:valid_valid_nonce_123"
                  }
                }
                """));

        verify(telegramBotClient).answerCallbackQuery("callback-1", "Действие больше недоступно.");
        verify(dailyPlanService, never()).cycleItemStatusFromTelegram(any(), any(), any());
        verifyNoInteractions(telegramLinkService);
    }

    private TelegramUpdateService service() {
        return new TelegramUpdateService(
                userRepository,
                dailyPlanService,
                telegramLinkService,
                telegramBotClient,
                telegramCallbackTokenRepository
        );
    }

    private User user(String username, Long id) {
        User user = new User(username, "{noop}password");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
