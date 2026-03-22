package com.resonant.socket;

import java.util.Map;
import java.util.Set;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resonant.entity.Message;

@ServerEndpoint("/chat/{channelId}")
@ApplicationScoped
public class MessageSocket {

    private static final Logger LOG = Logger.getLogger(MessageSocket.class.getName());

    // Map<ChannelId, Set<Session>>
    private final Map<Long, Set<Session>> sessions = new ConcurrentHashMap<>();

    @Inject
    JWTParser jwtParser;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    ManagedExecutor managedExecutor;

    @OnOpen
    public void onOpen(Session session, @PathParam("channelId") Long channelId) {
        sessions.computeIfAbsent(channelId, k -> ConcurrentHashMap.newKeySet()).add(session);
        LOG.info("Session opened: " + session.getId() + " for channel: " + channelId);
    }

    @OnClose
    public void onClose(Session session, @PathParam("channelId") Long channelId) {
        Set<Session> channelSessions = sessions.get(channelId);
        if (channelSessions != null) {
            channelSessions.remove(session);
        }
    }

    @OnError
    public void onError(Session session, @PathParam("channelId") Long channelId, Throwable throwable) {
        Set<Session> channelSessions = sessions.get(channelId);
        if (channelSessions != null) {
            channelSessions.remove(session);
        }
        LOG.severe("WebSocket error in channel " + channelId + ": " + throwable.getMessage());
    }

    @OnMessage
    public void onMessage(String messageJson, Session session, @PathParam("channelId") Long channelId) {
        managedExecutor.submit(() -> {
            try {
                LOG.info("Received message on WS (ignored, using HTTP for writes): " + messageJson);
                broadcast(channelId, messageJson);
            } catch (Exception e) {
                LOG.warning("Failed to process message: " + e.getMessage());
                // Optionally send error back to sender
                session.getAsyncRemote().sendText("{\"error\": \"Unauthorized or Invalid Format\"}");
            }
        });
    }

    public void broadcast(Long channelId, Message message) {
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

    private void broadcast(Long channelId, String message) {
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
