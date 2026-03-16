package com.resonant.service;

import com.resonant.entity.User;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;

@ApplicationScoped
public class JwtService {

    @ConfigProperty(name = "app.jwt.expiry-seconds", defaultValue = "3600")
    int expirySeconds;

    @ConfigProperty(name = "app.jwt.issuer", defaultValue = "resonant-app")
    String issuer;

    @ConfigProperty(name = "app.jwt.audience", defaultValue = "resonant-users")
    String audience;

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiryTime = now.plusSeconds(expirySeconds);

        return Jwt.issuer(issuer)
            .subject(user.id.toString())
            .audience(audience)
            .issuedAt(now)
            .expiresAt(expiryTime)
            .claim("username", user.username)
            .claim("email", user.email)
            .sign();
    }
}
