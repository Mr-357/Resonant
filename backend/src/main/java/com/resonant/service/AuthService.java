package com.resonant.service;

import com.resonant.dto.AuthResponse;
import com.resonant.dto.LoginRequest;
import com.resonant.dto.RegisterRequest;
import com.resonant.entity.User;
import com.resonant.repository.UserRepository;

import io.quarkus.security.AuthenticationFailedException;

import org.apache.commons.codec.digest.DigestUtils;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.WebApplicationException;

import java.util.Optional;

@ApplicationScoped
public class AuthService {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final BlindIndexService blindIndexService;

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
        user.passwordHash = DigestUtils.sha256Hex(request.password);
        userRepository.persist(user);

        String token = jwtService.generateToken(user);
        return new AuthResponse(user.id, user.username, token);
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

        String passwordHash = DigestUtils.sha256Hex(request.password);
        if (!passwordHash.equals(user.passwordHash)) {
            throw new WebApplicationException("Invalid credentials", 401);
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(user.id, user.username, token);
    }
}
