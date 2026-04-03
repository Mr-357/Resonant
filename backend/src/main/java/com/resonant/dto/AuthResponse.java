package com.resonant.dto;

import java.util.UUID;

public class AuthResponse {
    public UUID userId;
    public String username;
    public String token;

    public AuthResponse() {}

    public AuthResponse(UUID userId, String username, String token) {
        this.userId = userId;
        this.username = username;
        this.token = token;
    }
}
