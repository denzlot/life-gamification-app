package com.dcorp.flowvisior.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// что приходит при регистрации
public class RegisterRequest {
    @NotBlank
    @Size (min = 3, max = 50)
    @Pattern(regexp = "^\\s*[A-Za-z0-9_.-]+\\s*$")
    private String username;

    @NotBlank
    @Size (min = 8, max = 100)
    private String password;

    public String getUsername() { return username; }
    public String getPassword() { return password; }

}
