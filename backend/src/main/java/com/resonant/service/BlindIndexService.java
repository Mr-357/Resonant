package com.resonant.service;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@ApplicationScoped
public class BlindIndexService {

    @ConfigProperty(name = "app.encryption.blind-index-key")
    String salt;

    public String generateBlindIndex(String input) {
        if (input == null) return null;
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(salt.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);

            // Normalize input (lowercase, trim) for search consistency
            return Base64.getEncoder().encodeToString(sha256_HMAC.doFinal(input.toLowerCase().trim().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate blind index", e);
        }
    }
}