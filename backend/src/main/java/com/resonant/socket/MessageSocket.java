package com.resonant.socket;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;
import java.util.logging.Logger;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.context.ManagedExecutor;
import java.util.HashMap;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;

import io.smallrye.jwt.auth.principal.JWTParser;
import org.eclipse.microprofile.jwt.JsonWebToken;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resonant.entity.Message;

import com.resonant.service.MessageService;
@ServerEndpoint("/chat/{channelId}")
@ApplicationScoped
public class MessageSocket {

    private static final Logger LOG = Logger.getLogger(MessageSocket.class.getName());

    // Map<ChannelId, Set<Session>>
    private final Map<UUID, Set<Session>> sessions = new ConcurrentHashMap<>();

    @Inject
    JWTParser jwtParser;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    ManagedExecutor managedExecutor;
    
    @Inject
    MessageService messageService;

    @OnOpen
    public void onOpen(Session session, @PathParam("channelId") String channelId) {
        UUID id = UUID.fromString(channelId);
        sessions.computeIfAbsent(id, k -> ConcurrentHashMap.newKeySet()).add(session);
        LOG.info("Session opened: " + session.getId() + " for channel: " + id);
    }

    @OnClose
    public void onClose(Session session, @PathParam("channelId") String channelId) {
        UUID id = UUID.fromString(channelId);
        Set<Session> channelSessions = sessions.get(id);
        if (channelSessions != null) {
            channelSessions.remove(session);
        }
    }

    @OnError
    public void onError(Session session, @PathParam("channelId") String channelId, Throwable throwable) {
        UUID id = UUID.fromString(channelId);
        Set<Session> channelSessions = sessions.get(id);
        if (channelSessions != null) {
            channelSessions.remove(session);
        }
        LOG.severe("WebSocket error in channel " + id + ": " + throwable.getMessage());
    }

    @OnMessage
    public void onMessage(String messageJson, Session session, @PathParam("channelId") String channelId) {
        managedExecutor.submit(() -> {
            try {
                UUID channelUuid = UUID.fromString(channelId);
                LOG.info("Received message on WS for channel " + channelUuid + ": " + messageJson);

                // Parse the incoming JSON message
                JsonNode rootNode = objectMapper.readTree(messageJson);
                String token = rootNode.has("token") ? rootNode.get("token").asText() : null;
                String content = rootNode.has("content") ? rootNode.get("content").asText() : null;

                if (token == null || content == null || content.isBlank()) {
                    session.getAsyncRemote().sendText("{\"error\": \"Invalid message format or missing token/content\"}");
                    return;
                }

                // Authenticate and get user ID from token
                JsonWebToken jwt = jwtParser.parse(token);
                UUID userId = UUID.fromString(jwt.getSubject());

                // Use MessageService to create the message, which will handle persistence and broadcasting
                messageService.create(channelUuid, content, userId);
            } catch (Exception e) {
                LOG.warning("Failed to process message: " + e.getMessage());
                // Optionally send error back to sender
                session.getAsyncRemote().sendText("{\"error\": \"Unauthorized or Invalid Format\"}");
            }
        });
    }

    public void broadcast(UUID channelId, Message message) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("id", message.id);
            response.put("content", message.content);
            if (message.author != null) {
                response.put("author", message.author.username);
                response.put("authorId", message.author.id);
            }
            response.put("createdAt", message.createdAt != null ? message.createdAt.toString() : Instant.now().toString());
            
            String json = objectMapper.writeValueAsString(response);
            broadcast(channelId, json);
        } catch (Exception e) {
            LOG.severe("Failed to broadcast message: " + e.getMessage());
        }
    }

    private void broadcast(UUID channelId, String message) {
        Set<Session> channelSessions = sessions.get(channelId);
        if (channelSessions != null) {
            channelSessions.forEach(s -> {
                s.getAsyncRemote().sendText(message, result -> {
                   if (result.getException() != null) {
                       LOG.warning("Unable to send message: " + result.getException());
                   }
                });
            });
        }
    }
}
