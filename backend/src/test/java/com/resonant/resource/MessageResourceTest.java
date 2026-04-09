package com.resonant.resource;

import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@QuarkusTestResource(TestContainersLifecycleManager.class)
class MessageResourceTest {

    private static final String BASE_URL = "https://localhost:8444/api";
    private static final String AUTH_REGISTER = BASE_URL + "/auth/register";
    private static final String SERVERS_ENDPOINT = BASE_URL + "/servers";

    private String authToken;
    private UUID serverId;
    private UUID channelId;

    @BeforeEach
    void setup() {
        // Register and login to get auth token
        long timestamp = System.currentTimeMillis();
        String registerPayload = """
            {
                "username": "messagetest_%d",
                "email": "messagetest_%d@example.com",
                "password": "MessageTestPass123!"
            }
            """.formatted(timestamp, timestamp);

        Response registerResponse = given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(AUTH_REGISTER);

        assertEquals(201, registerResponse.statusCode());
        authToken = registerResponse.jsonPath().getString("token");

        // Create a server
        String createServerPayload = """
            {
                "name": "Message Test Server",
                "description": "Server for message tests"
            }
            """;

        Response serverResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT);

        assertEquals(201, serverResponse.statusCode());
        serverId = UUID.fromString(serverResponse.jsonPath().getString("id"));

        // Create a channel
        String channelsEndpoint = SERVERS_ENDPOINT + "/" + serverId + "/channels";
        String createChannelPayload = """
            {
                "name": "general",
                "description": "General channel"
            }
            """;

        Response channelResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createChannelPayload)
        .when()
            .post(channelsEndpoint);

        assertEquals(201, channelResponse.statusCode());
        channelId = UUID.fromString(channelResponse.jsonPath().getString("id"));
    }

    @Test
    void testSendMessage() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";
        String createMessagePayload = """
            {
                "content": "Hello, this is a test message!"
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createMessagePayload)
        .when()
            .post(messagesEndpoint)
        .then()
            .statusCode(201)
            .body("content", equalTo("Hello, this is a test message!"))
            .body("id", notNullValue())
            .body("authorId", notNullValue())
            .body("createdAt", notNullValue());
    }

    @Test
    void testGetMessages() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";

        // Send a message first
        String createMessagePayload = """
            {
                "content": "Message to retrieve"
            }
            """;

        Response messageResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createMessagePayload)
        .when()
            .post(messagesEndpoint);

        assertEquals(201, messageResponse.statusCode());

        // Get all messages
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get(messagesEndpoint)
        .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("content", hasItem("Message to retrieve"));
    }

    @Test
    void testGetMessagesWithLimit() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";

        // Send multiple messages
        for (int i = 0; i < 3; i++) {
            String createMessagePayload = """
                {
                    "content": "Message %d"
                }
                """.formatted(i + 1);

            given()
                .header("Authorization", "Bearer " + authToken)
                .contentType(ContentType.JSON)
                .body(createMessagePayload)
            .when()
                .post(messagesEndpoint);
        }

        // Get messages with limit of 2
        given()
            .header("Authorization", "Bearer " + authToken)
            .queryParam("limit", 2)
        .when()
            .get(messagesEndpoint)
        .then()
            .statusCode(200)
            .body("size()", lessThanOrEqualTo(2));
    }

    @Test
    void testDeleteMessage() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";

        // Send a message first
        String createMessagePayload = """
            {
                "content": "Message to delete"
            }
            """;

        Response messageResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createMessagePayload)
        .when()
            .post(messagesEndpoint);

        UUID messageId = UUID.fromString(messageResponse.jsonPath().getString("id"));

        // Delete the message
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .delete(messagesEndpoint + "/" + messageId)
        .then()
            .statusCode(204);
    }

    @Test
    void testSendEmptyMessage() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";
        String createMessagePayload = """
            {
                "content": ""
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createMessagePayload)
        .when()
            .post(messagesEndpoint)
        .then()
            .statusCode(400);
    }

    @Test
    void testSendMessageTooLong() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";
        String longContent = "x".repeat(4001);
        String createMessagePayload = """
            {
                "content": "%s"
            }
            """.formatted(longContent);

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createMessagePayload)
        .when()
            .post(messagesEndpoint)
        .then()
            .statusCode(400);
    }

    @Test
    void testSendMessageWithoutAuth() {
        String messagesEndpoint = BASE_URL + "/channels/" + channelId + "/messages";
        String createMessagePayload = """
            {
                "content": "Unauthorized message"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(createMessagePayload)
        .when()
            .post(messagesEndpoint)
        .then()
            .statusCode(401);
    }
}
