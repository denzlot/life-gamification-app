package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.auth.AuthResponse;
import com.dcorp.flowvisior.dto.auth.LoginRequest;
import com.dcorp.flowvisior.dto.auth.RegisterRequest;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.UserRepository;
import com.dcorp.flowvisior.service.UserGameStatsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

// endpoints: /api/auth/register, /login, /logout, /me
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UserGameStatsService userGameStatsService;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository,
                          PasswordEncoder passwordEncoder, SecurityContextRepository securityContextRepository, UserGameStatsService userGameStatsService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityContextRepository = securityContextRepository;
        this.userGameStatsService = userGameStatsService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // проверяем что username не занят
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    User user = new User(request.getUsername(), passwordEncoder.encode(request.getPassword()));

    User saved = userRepository.save(user);
    userGameStatsService.createFor(saved);
    return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(new AuthResponse(saved.getId(), saved.getUsername(), saved.getRole().name()));
    }


    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login (@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpServletRequest,
                                               HttpServletResponse httpServletResponse) {
    // проверяем логин и пароль
        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                request.getUsername(),
                request.getPassword()));

        // сохраняем авторизацию в сессию
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpServletRequest, httpServletResponse);

        // достаем пользователя из бд чтобы вернуть id

        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();

        return ResponseEntity.ok(
                new AuthResponse(user.getId(), user.getUsername(), user.getRole().name())
        );


    }
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        request.getSession(false); // не создавать сессию если её нет
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate(); // уничтожаем сессию
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
}

