package com.dcorp.flowvisior.dto.auth;

import jakarta.validation.constraints.NotBlank;

// что приходит при входе
public class LoginRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    public String getUsername() {return username; }
    public String getPassword() {return password; }
}
