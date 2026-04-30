package com.dcorp.flowvisior.dto.auth;
// что отвечаем после входа/регистрации
public class AuthResponse {
    private Long id;
    private String username;
    private String role;

    public AuthResponse(Long id, String username, String role) {
        this.id = id;
        this.username = username;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getRole() { return role; }
}
