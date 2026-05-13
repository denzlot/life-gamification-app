package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.auth.AuthResponse;
import com.dcorp.flowvisior.dto.auth.LoginRequest;
import com.dcorp.flowvisior.dto.auth.RegisterRequest;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.UserRepository;
import com.dcorp.flowvisior.service.LoginAttemptService;
import com.dcorp.flowvisior.service.UserGameStatsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UserGameStatsService userGameStatsService;
    private final LoginAttemptService loginAttemptService;

    public AuthController(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SecurityContextRepository securityContextRepository,
            UserGameStatsService userGameStatsService,
            LoginAttemptService loginAttemptService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityContextRepository = securityContextRepository;
        this.userGameStatsService = userGameStatsService;
        this.loginAttemptService = loginAttemptService;
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        String username = normalizeUsername(request.getUsername());
        if (username.length() < 3 || username.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Некорректное значение поля username");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        User user = new User(username, passwordEncoder.encode(request.getPassword()));
        User saved = userRepository.saveAndFlush(user);
        userGameStatsService.createFor(saved);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new AuthResponse(saved.getId(), saved.getUsername(), saved.getRole().name()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpServletRequest,
            HttpServletResponse httpServletResponse
    ) {
        String username = normalizeUsername(request.getUsername());
        String ipAddress = clientIp(httpServletRequest);
        loginAttemptService.throttle(username, ipAddress);

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                    username,
                    request.getPassword()
            ));
        } catch (AuthenticationException exception) {
            loginAttemptService.recordFailure(username, ipAddress);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверное имя пользователя или пароль");
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        httpServletRequest.getSession(true);
        httpServletRequest.changeSessionId();
        securityContextRepository.saveContext(context, httpServletRequest, httpServletResponse);
        loginAttemptService.recordSuccess(username, ipAddress);

        User user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();

        return ResponseEntity.ok(
                new AuthResponse(user.getId(), user.getUsername(), user.getRole().name())
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(
                new AuthResponse(user.getId(), user.getUsername(), user.getRole().name())
        );
    }

    private static String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
