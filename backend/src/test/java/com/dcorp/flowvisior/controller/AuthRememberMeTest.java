package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth-remember-me-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=KEY;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "telegram.bot.token=",
        "telegram.polling.enabled=false",
        "app.security.remember-me.key=test-remember-me-key"
})
@AutoConfigureMockMvc
class AuthRememberMeTest {
    private static final String USERNAME = "remember-user";
    private static final String PASSWORD = "password";
    private static final int REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS persistent_logins (
                    username VARCHAR(64) NOT NULL,
                    series VARCHAR(64) PRIMARY KEY,
                    token VARCHAR(64) NOT NULL,
                    last_used TIMESTAMP NOT NULL
                )
                """);
        jdbcTemplate.update("DELETE FROM persistent_logins");
        jdbcTemplate.update("DELETE FROM user_game_stats");
        jdbcTemplate.update("DELETE FROM users");
        userRepository.save(new User(USERNAME, passwordEncoder.encode(PASSWORD)));
    }

    @Test
    void loginSetsRememberMeCookie() throws Exception {
        MvcResult login = login();

        Cookie rememberMe = rememberMeCookie(login);
        assertThat(rememberMe).isNotNull();
        assertThat(rememberMe.isHttpOnly()).isTrue();
        assertThat(rememberMe.getMaxAge()).isEqualTo(REMEMBER_ME_MAX_AGE_SECONDS);
        assertThat(rememberMe.getValue()).isNotBlank();
        assertThat(persistentLoginCount()).isEqualTo(1);
    }

    @Test
    void meWorksAfterLoginWithSession() throws Exception {
        MvcResult login = login();

        mockMvc.perform(get("/api/auth/me").session(session(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME));
    }

    @Test
    void meWorksWithRememberMeCookieAfterSessionExpires() throws Exception {
        MvcResult login = login();

        mockMvc.perform(get("/api/auth/me").cookie(rememberMeCookie(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME));
    }

    @Test
    void logoutClearsSessionAndRememberMeToken() throws Exception {
        MvcResult login = login();
        MockHttpSession session = session(login);
        Cookie rememberMe = rememberMeCookie(login);

        MvcResult logout = mockMvc.perform(post("/api/auth/logout")
                        .with(csrf())
                        .session(session)
                        .cookie(rememberMe))
                .andExpect(status().isOk())
                .andReturn();

        Cookie clearedRememberMe = logout.getResponse().getCookie("remember-me");
        assertThat(clearedRememberMe).isNotNull();
        assertThat(clearedRememberMe.getMaxAge()).isZero();
        assertThat(session.isInvalid()).isTrue();
        assertThat(persistentLoginCount()).isZero();

        mockMvc.perform(get("/api/auth/me").cookie(rememberMe))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void removedRememberMeTokenDoesNotAuthorizeUser() throws Exception {
        MvcResult login = login();
        Cookie rememberMe = rememberMeCookie(login);
        jdbcTemplate.update("DELETE FROM persistent_logins");

        MvcResult me = mockMvc.perform(get("/api/auth/me").cookie(rememberMe))
                .andExpect(status().isUnauthorized())
                .andReturn();

        Cookie clearedRememberMe = me.getResponse().getCookie("remember-me");
        assertThat(clearedRememberMe).isNotNull();
        assertThat(clearedRememberMe.getMaxAge()).isZero();
    }

    private MvcResult login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(USERNAME, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USERNAME))
                .andReturn();
    }

    private Cookie rememberMeCookie(MvcResult result) {
        return result.getResponse().getCookie("remember-me");
    }

    private MockHttpSession session(MvcResult result) {
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private Integer persistentLoginCount() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM persistent_logins", Integer.class);
    }
}
