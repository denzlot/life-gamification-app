package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.admin.UpdateGameStatsRequest;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserGameStats;
import com.dcorp.flowvisior.repository.UserGameStatsRepository;
import com.dcorp.flowvisior.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserGameStatsRepository userGameStatsRepository;

    @Test
    void updateGameStatsRecalculatesLevelWhenXpChanges() {
        User user = new User("user", "{noop}password");
        UserGameStats stats = new UserGameStats(user);
        UpdateGameStatsRequest request = mock(UpdateGameStatsRequest.class);

        when(request.getXp()).thenReturn(500);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userGameStatsRepository.findByUser(user)).thenReturn(Optional.of(stats));

        var response = service().updateGameStats(7L, request);

        assertThat(response.getXp()).isEqualTo(500);
        assertThat(response.getLevel()).isEqualTo(2);
        verify(userGameStatsRepository).save(stats);
    }

    @Test
    void updateGameStatsRejectsNegativeValues() {
        User user = new User("user", "{noop}password");
        UserGameStats stats = new UserGameStats(user);
        UpdateGameStatsRequest request = mock(UpdateGameStatsRequest.class);

        when(request.getStreak()).thenReturn(-1);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userGameStatsRepository.findByUser(user)).thenReturn(Optional.of(stats));

        assertThatThrownBy(() -> service().updateGameStats(7L, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(userGameStatsRepository, never()).save(stats);
    }

    private AdminService service() {
        return new AdminService(userRepository, userGameStatsRepository);
    }
}
