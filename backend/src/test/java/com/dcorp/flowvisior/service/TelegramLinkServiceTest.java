package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.telegram.CreateTelegramLinkResponse;
import com.dcorp.flowvisior.entity.TelegramLinkCode;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TelegramLinkCodeRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramLinkServiceTest {

    @Mock
    private TelegramLinkCodeRepository telegramLinkCodeRepository;

    @Mock
    private UserRepository userRepository;

    @Test
    void createLinkCodeStoresHashAndBuildsDeepLink() {
        User user = user("owner", 1L);
        when(telegramLinkCodeRepository.save(any(TelegramLinkCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateTelegramLinkResponse response = service("@FlowvisiorBot").createLinkCode(user);

        assertThat(response.linkCode()).matches("[A-Za-z0-9_-]{32,64}");
        assertThat(response.deepLink()).isEqualTo("https://t.me/FlowvisiorBot?start=" + response.linkCode());
        assertThat(response.expiresAt()).isAfter(LocalDateTime.now());

        ArgumentCaptor<TelegramLinkCode> captor = ArgumentCaptor.forClass(TelegramLinkCode.class);
        verify(telegramLinkCodeRepository).deleteByUserAndUsedAtIsNull(user);
        verify(telegramLinkCodeRepository).deleteByExpiresAtBeforeOrUsedAtIsNotNull(any(LocalDateTime.class));
        verify(telegramLinkCodeRepository).save(captor.capture());

        String storedHash = (String) ReflectionTestUtils.getField(captor.getValue(), "codeHash");
        assertThat(storedHash).hasSize(64);
        assertThat(storedHash).doesNotContain(response.linkCode());
    }

    @Test
    void linkByCodeLinksUserAndConsumesCode() {
        User user = user("owner", 1L);
        TelegramLinkCode linkCode = new TelegramLinkCode(user, "hash", LocalDateTime.now().plusMinutes(5));

        when(telegramLinkCodeRepository.findByCodeHash(anyString())).thenReturn(Optional.of(linkCode));
        when(userRepository.findByTelegramChatId(123L)).thenReturn(Optional.empty());

        User linked = service("").linkByCode("valid_valid_valid_valid_valid_1234", 123L);

        assertThat(linked).isSameAs(user);
        assertThat(user.getTelegramChatId()).isEqualTo(123L);
        assertThat(user.isTelegramRemindersEnabled()).isTrue();
        assertThat(user.isTelegramPlannedRemindersEnabled()).isTrue();
        assertThat(user.isTelegramDeadlineRemindersEnabled()).isTrue();
        assertThat(linkCode.isAvailable(LocalDateTime.now())).isFalse();

        verify(userRepository).save(user);
        verify(telegramLinkCodeRepository).save(linkCode);
    }

    @Test
    void linkByCodeRejectsTelegramChatLinkedToAnotherUser() {
        User target = user("target", 1L);
        User existing = user("existing", 2L);
        TelegramLinkCode linkCode = new TelegramLinkCode(target, "hash", LocalDateTime.now().plusMinutes(5));

        when(telegramLinkCodeRepository.findByCodeHash(anyString())).thenReturn(Optional.of(linkCode));
        when(userRepository.findByTelegramChatId(123L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service("").linkByCode("valid_valid_valid_valid_valid_1234", 123L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Telegram is already linked to another account");

        assertThat(target.isTelegramLinked()).isFalse();
        verify(userRepository, never()).save(target);
        verify(telegramLinkCodeRepository, never()).save(linkCode);
    }

    private TelegramLinkService service(String botUsername) {
        return new TelegramLinkService(telegramLinkCodeRepository, userRepository, botUsername);
    }

    private User user(String username, Long id) {
        User user = new User(username, "{noop}password");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}
