package com.resonant.dto;

public class AuthResponse {
    public Long userId;
    public String username;
    public String token;

    public AuthResponse() {}

    public AuthResponse(Long userId, String username, String token) {
        this.userId = userId;
        this.username = username;
        this.token = token;
    }
}
