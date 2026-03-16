package com.resonant.service;

import com.resonant.dto.AuthResponse;
import com.resonant.dto.LoginRequest;
import com.resonant.dto.RegisterRequest;
import com.resonant.entity.User;
import com.resonant.repository.UserRepository;
import org.apache.commons.codec.digest.DigestUtils;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.util.Optional;

@ApplicationScoped
public class AuthService {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public AuthService(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) throws Exception {
        if (request.username == null || request.username.isBlank()) {
            throw new Exception("Username is required");
        }
        if (request.email == null || request.email.isBlank()) {
            throw new Exception("Email is required");
        }
        if (request.password == null || request.password.isBlank()) {
            throw new Exception("Password is required");
        }

        Optional<User> existingUser = userRepository.findByUsername(request.username);
        if (existingUser.isPresent()) {
            throw new Exception("Username already exists");
        }

        Optional<User> existingEmail = userRepository.findByEmail(request.email);
        if (existingEmail.isPresent()) {
            throw new Exception("Email already exists");
        }

        User user = new User();
        user.username = request.username;
        user.email = request.email;
        user.passwordHash = DigestUtils.sha256Hex(request.password);
        userRepository.persist(user);

        String token = jwtService.generateToken(user);
        return new AuthResponse(user.id, user.username, token);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) throws Exception {
        if (request.username == null || request.password == null) {
            throw new Exception("Username and password are required");
        }

        Optional<User> userOpt = userRepository.findByUsername(request.username);
        if (userOpt.isEmpty()) {
            throw new Exception("Invalid credentials");
        }
        User user = userOpt.get();

        String passwordHash = DigestUtils.sha256Hex(request.password);
        if (!passwordHash.equals(user.passwordHash)) {
            throw new Exception("Invalid credentials");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(user.id, user.username, token);
    }
}
