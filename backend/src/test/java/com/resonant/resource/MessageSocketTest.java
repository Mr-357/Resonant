package com.resonant.resource;

import com.resonant.dto.AuthResponse;
import com.resonant.dto.RegisterRequest;
import com.resonant.entity.Channel;
import com.resonant.entity.Server;
import com.resonant.entity.User;
import com.resonant.repository.MessageRepository;
import com.resonant.repository.ChannelRepository;
import com.resonant.repository.ServerRepository;
import com.resonant.repository.UserRepository;
import com.resonant.service.AuthService;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.websocket.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;

@QuarkusTest
public class MessageSocketTest {

    @Inject
    AuthService authService;

    @Inject
    UserRepository userRepository;

    @Inject
    ServerRepository serverRepository;

    @Inject
    ChannelRepository channelRepository;

    @Inject
    MessageRepository messageRepository;

    @TestHTTPResource("/chat")
    URI chatUri;

    private String token;
    private UUID channelId;

    @BeforeEach
    @Transactional
    public void setup() throws Exception {
        // Clear data to ensure clean state
        // Delete in reverse order of foreign key dependencies
        messageRepository.deleteAll();
        channelRepository.deleteAll();
        serverRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Register a user to get a valid JWT
        RegisterRequest req = new RegisterRequest();
        req.username = "socketuser";
        req.email = "socket@test.com";
        req.password = "password";
        AuthResponse auth = authService.register(req);
        this.token = auth.token;
        User user = userRepository.findById(auth.userId);

        // 2. Create Server & Channel
        Server server = new Server();
        server.name = "Socket Server";
        server.owner = user;
        serverRepository.persist(server);

        Channel channel = new Channel();
        channel.name = "general";
        channel.server = server;
        channelRepository.persist(channel);
        this.channelId = channel.id;
    }

    @Test
    public void testWebSocketChat() throws Exception {
        LinkedBlockingDeque<String> messages = new LinkedBlockingDeque<>();

        // Connect to the WebSocket endpoint
        try (Session session = ContainerProvider.getWebSocketContainer().connectToServer(new Endpoint() {
            @Override
            public void onOpen(Session session, EndpointConfig config) {
                session.addMessageHandler(String.class, messages::add);
            }
        }, ClientEndpointConfig.Builder.create().build(), URI.create(chatUri.toString() + "/" + channelId))) {

            // Send a message with the valid token
            String payload = String.format("{\"token\":\"%s\", \"content\":\"Hello WebSocket\"}", token);
            session.getAsyncRemote().sendText(payload);

            // Wait for the broadcast message (should arrive almost instantly)
            String received = messages.poll(5, TimeUnit.SECONDS);
            
            Assertions.assertNotNull(received, "Should receive a broadcast message");
            Assertions.assertTrue(received.contains("Hello WebSocket"), "Message content should be present");
            Assertions.assertTrue(received.contains("socketuser"), "Author username should be present");
        }
    }
}