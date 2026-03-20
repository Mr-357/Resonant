package com.resonant.socket;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;
import java.util.logging.Logger;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.context.ManagedExecutor;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;

import io.smallrye.jwt.auth.principal.JWTParser;
import org.eclipse.microprofile.jwt.JsonWebToken;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resonant.entity.Message;
import com.resonant.service.MessageService;

// TODO: Import your MessageService and Entity
// import com.resonant.service.MessageService;
// import com.resonant.entity.Message;

@ServerEndpoint("/chat/{channelId}")
@ApplicationScoped
public class MessageSocket {

    private static final Logger LOG = Logger.getLogger(MessageSocket.class.getName());

    // Map<ChannelId, Set<Session>>
    private final Map<String, Set<Session>> sessions = new ConcurrentHashMap<>();

    @Inject
    JWTParser jwtParser;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    MessageService messageService;

    @Inject
    ManagedExecutor managedExecutor;

    @OnOpen
    public void onOpen(Session session, @PathParam("channelId") String channelId) {
        sessions.computeIfAbsent(channelId, k -> ConcurrentHashMap.newKeySet()).add(session);
        LOG.fine("Session opened: " + session.getId() + " for channel: " + channelId);
    }

    @OnClose
    public void onClose(Session session, @PathParam("channelId") String channelId) {
        Set<Session> channelSessions = sessions.get(channelId);
        if (channelSessions != null) {
            channelSessions.remove(session);
        }
    }

    @OnError
    public void onError(Session session, @PathParam("channelId") String channelId, Throwable throwable) {
        Set<Session> channelSessions = sessions.get(channelId);
        if (channelSessions != null) {
            channelSessions.remove(session);
        }
        LOG.severe("WebSocket error in channel " + channelId + ": " + throwable.getMessage());
    }

    @OnMessage
    public void onMessage(String messageJson, Session session, @PathParam("channelId") String channelId) {
        managedExecutor.submit(() -> {
            try {
                // 1. Parse incoming message: { "token": "...", "content": "..." }
                Map<String, String> payload = objectMapper.readValue(messageJson, Map.class);
                String token = payload.get("token");
                String content = payload.get("content");

                if (token == null || content == null) return;

                // 2. Verify Token & Get User
                // This throws a ParseException if invalid/expired
                JsonWebToken jwt = jwtParser.parse(token);
                String username = jwt.getClaim("username");

                // 3. Persist Message to DB
                Message savedMsg = messageService.create(Long.parseLong(channelId), content, username);

                // 4. Construct Response for Broadcast
                // Mimic the structure expected by frontend (MessageDTO)
                Map<String, Object> response = new java.util.HashMap<>();
                response.put("id", savedMsg.id);
                response.put("content", savedMsg.content);
                response.put("author", savedMsg.author.username);
                response.put("createdAt", savedMsg.createdAt.toString());

                String broadcastJson = objectMapper.writeValueAsString(response);

                // 5. Broadcast to all clients in this channel
                broadcast(channelId, broadcastJson);

            } catch (Exception e) {
                LOG.warning("Failed to process message: " + e.getMessage());
                // Optionally send error back to sender
                session.getAsyncRemote().sendText("{\"error\": \"Unauthorized or Invalid Format\"}");
            }
        });
    }

    private void broadcast(String channelId, String message) {
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
