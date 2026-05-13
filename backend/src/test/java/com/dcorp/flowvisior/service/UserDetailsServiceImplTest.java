package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Test
    void bannedUserIsDisabledForSpringSecurity() {
        User user = new User("blocked", "{bcrypt}hash");
        user.ban();
        when(userRepository.findByUsernameIgnoreCase("blocked")).thenReturn(Optional.of(user));

        UserDetails userDetails = new UserDetailsServiceImpl(userRepository)
                .loadUserByUsername("blocked");

        assertThat(userDetails.isEnabled()).isFalse();
    }

    @Test
    void activeUserIsEnabledForSpringSecurity() {
        User user = new User("active", "{bcrypt}hash");
        when(userRepository.findByUsernameIgnoreCase("active")).thenReturn(Optional.of(user));

        UserDetails userDetails = new UserDetailsServiceImpl(userRepository)
                .loadUserByUsername("active");

        assertThat(userDetails.isEnabled()).isTrue();
    }
}
