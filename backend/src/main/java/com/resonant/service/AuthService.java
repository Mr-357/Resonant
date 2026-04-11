package com.resonant.service;

import com.resonant.dto.AuthResponse;
import com.resonant.dto.LoginRequest;
import com.resonant.dto.RegisterRequest;
import com.resonant.entity.User;
import com.resonant.repository.UserRepository;

import io.quarkus.security.AuthenticationFailedException;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.WebApplicationException;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;

import java.util.Optional;

@ApplicationScoped
public class AuthService {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final BlindIndexService blindIndexService;

    private static final int ITERATIONS = 600000; // OWASP recommended for PBKDF2-HMAC-SHA256
    private static final int KEY_LENGTH = 256;
    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(JwtService jwtService, UserRepository userRepository, BlindIndexService blindIndexService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.blindIndexService = blindIndexService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) throws BadRequestException {
        if (request.username == null || request.username.isBlank()) {
            throw new BadRequestException("Username is required");
        }
        if (request.email == null || request.email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (request.password == null || request.password.isBlank()) {
            throw new BadRequestException("Password is required");
        }

        String usernameIndex = blindIndexService.generateBlindIndex(request.username);
        String emailIndex = blindIndexService.generateBlindIndex(request.email);

        Optional<User> existingUser = userRepository.findByUsernameIndex(usernameIndex);
        if (existingUser.isPresent()) {
            throw new BadRequestException("Username already exists");
        }

        Optional<User> existingEmail = userRepository.findByEmailIndex(emailIndex);
        if (existingEmail.isPresent()) {
            throw new BadRequestException("Email already exists");
        }

        User user = new User();
        user.username = request.username;
        user.usernameBlindIndex = usernameIndex;
        user.email = request.email;
        user.emailBlindIndex = emailIndex;
        
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        user.passwordHash = hashPassword(request.password, salt);
        
        userRepository.persist(user);

        String token = jwtService.generateToken(user);
        return new AuthResponse(user.id, user.username, token);
    }

    private String hashPassword(String password, byte[] salt) {
        try {
            KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
            SecretKeyFactory factory = SecretKeyFactory.getInstance(ALGORITHM);
            byte[] hash = factory.generateSecret(spec).getEncoded();
            return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    private boolean verifyPassword(String password, String storedPasswordHash) {
        try {
            String[] parts = storedPasswordHash.split(":");
            if (parts.length != 2) return false;
            byte[] salt = Base64.getDecoder().decode(parts[0]);
            byte[] storedHash = Base64.getDecoder().decode(parts[1]);

            KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
            SecretKeyFactory factory = SecretKeyFactory.getInstance(ALGORITHM);
            byte[] testHash = factory.generateSecret(spec).getEncoded();

            return MessageDigest.isEqual(storedHash, testHash);
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public AuthResponse login(LoginRequest request) throws AuthenticationFailedException, WebApplicationException {
        if (request.username == null || request.password == null) {
            throw new AuthenticationFailedException("Username and password are required");
        }

        String usernameIndex = blindIndexService.generateBlindIndex(request.username);
        Optional<User> userOpt = userRepository.findByUsernameIndex(usernameIndex);
        if (userOpt.isEmpty()) {
            throw new AuthenticationFailedException("Invalid credentials");
        }
        User user = userOpt.get();

        if (!verifyPassword(request.password, user.passwordHash)) {
            throw new WebApplicationException("Invalid credentials", 401);
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(user.id, user.username, token);
    }
}
