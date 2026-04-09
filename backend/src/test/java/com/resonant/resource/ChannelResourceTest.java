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
class ChannelResourceTest {

    private static final String BASE_URL = "https://localhost:8444/api";
    private static final String AUTH_REGISTER = BASE_URL + "/auth/register";
    private static final String SERVERS_ENDPOINT = BASE_URL + "/servers";

    private String authToken;
    private UUID serverId;

    @BeforeEach
    void setup() {
        // Register and login to get auth token
        long timestamp = System.currentTimeMillis();
        String registerPayload = """
            {
                "username": "channeltest_%d",
                "email": "channeltest_%d@example.com",
                "password": "ChannelTestPass123!"
            }
            """.formatted(timestamp, timestamp);

        Response registerResponse = given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(AUTH_REGISTER);

        assertEquals(201, registerResponse.statusCode());
        authToken = registerResponse.jsonPath().getString("token");

        // Create a server for testing channels
        String createServerPayload = """
            {
                "name": "Channel Test Server",
                "description": "Server for channel tests"
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
    }

    @Test
    void testCreateChannel() {
        String channelsEndpoint = SERVERS_ENDPOINT + "/" + serverId + "/channels";
        String createChannelPayload = """
            {
                "name": "general",
                "description": "General discussion channel"
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createChannelPayload)
        .when()
            .post(channelsEndpoint)
        .then()
            .statusCode(201)
            .body("name", equalTo("general"))
            .body("description", equalTo("General discussion channel"))
            .body("id", notNullValue());
    }

    @Test
    void testGetChannels() {
        String channelsEndpoint = SERVERS_ENDPOINT + "/" + serverId + "/channels";

        // Create a channel first
        String createChannelPayload = """
            {
                "name": "announcements",
                "description": "Announcements channel"
            }
            """;

        Response createResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createChannelPayload)
        .when()
            .post(channelsEndpoint);

        assertEquals(201, createResponse.statusCode());

        // Get all channels
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get(channelsEndpoint)
        .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("name", hasItem("announcements"));
    }

    @Test
    void testDeleteChannel() {
        String channelsEndpoint = SERVERS_ENDPOINT + "/" + serverId + "/channels";

        // Create a channel first
        String createChannelPayload = """
            {
                "name": "to-delete",
                "description": "Channel to delete"
            }
            """;

        Response createResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createChannelPayload)
        .when()
            .post(channelsEndpoint);

        UUID channelId = UUID.fromString(createResponse.jsonPath().getString("id"));

        // Delete the channel
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .delete(channelsEndpoint + "/" + channelId)
        .then()
            .statusCode(204);
    }

    @Test
    void testCreateChannelWithoutAuth() {
        String channelsEndpoint = SERVERS_ENDPOINT + "/" + serverId + "/channels";
        String createChannelPayload = """
            {
                "name": "unauthorized",
                "description": "Should fail"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(createChannelPayload)
        .when()
            .post(channelsEndpoint)
        .then()
            .statusCode(401);
    }

    @Test
    void testCreateChannelWithEmptyName() {
        String channelsEndpoint = SERVERS_ENDPOINT + "/" + serverId + "/channels";
        String createChannelPayload = """
            {
                "name": "",
                "description": "Invalid channel"
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createChannelPayload)
        .when()
            .post(channelsEndpoint)
        .then()
            .statusCode(400);
    }

    @Test
    void testGetChannelsInNonexistentServer() {
        String channelsEndpoint = SERVERS_ENDPOINT + "/99999/channels";

        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get(channelsEndpoint)
        .then()
            .statusCode(404);
    }
}
