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
class ServerResourceTest {

    private static final String BASE_URL = "https://localhost:8444/api";
    private static final String SERVERS_ENDPOINT = BASE_URL + "/servers";
    private static final String AUTH_REGISTER = BASE_URL + "/auth/register";
    private static final String AUTH_LOGIN = BASE_URL + "/auth/login";

    private String authToken;
    private UUID userId;

    @BeforeEach
    void setup() {
        // Register and login to get auth token
        long timestamp = System.currentTimeMillis();
        String registerPayload = """
            {
                "username": "servertest_%d",
                "email": "servertest_%d@example.com",
                "password": "ServerTestPass123!"
            }
            """.formatted(timestamp, timestamp);

        Response registerResponse = given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(AUTH_REGISTER);

        assertEquals(201, registerResponse.statusCode());
        authToken = registerResponse.jsonPath().getString("token");
        userId = UUID.fromString(registerResponse.jsonPath().getString("userId"));
    }

    @Test
    void testCreateServer() {
        String createServerPayload = """
            {
                "name": "Test Server",
                "description": "A test server for integration tests"
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT)
        .then()
            .statusCode(201)
            .body("name", equalTo("Test Server"))
            .body("description", equalTo("A test server for integration tests"))
            .body("id", notNullValue());
    }

    @Test
    void testGetServers() {
        // Create a server first
        String createServerPayload = """
            {
                "name": "Server to Retrieve",
                "description": "A server to retrieve"
            }
            """;

        Response createResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT);

        assertEquals(201, createResponse.statusCode());

        // Get all servers
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get(SERVERS_ENDPOINT)
        .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("name", hasItem("Server to Retrieve"));
    }

    @Test
    void testGetServerById() {
        // Create a server first
        String createServerPayload = """
            {
                "name": "Server to Get",
                "description": "A specific server"
            }
            """;

        Response createResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT);

        UUID serverId = UUID.fromString(createResponse.jsonPath().getString("id"));

        // Get the specific server
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get(SERVERS_ENDPOINT + "/" + serverId)
        .then()
            .statusCode(200)
            .body("id", equalTo(serverId.toString()))
            .body("name", equalTo("Server to Get"));
    }

    @Test
    void testDeleteServer() {
        // Create a server first
        String createServerPayload = """
            {
                "name": "Server to Delete",
                "description": "A server to delete"
            }
            """;

        Response createResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT);

        UUID serverId = UUID.fromString(createResponse.jsonPath().getString("id"));

        // Delete the server
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .delete(SERVERS_ENDPOINT + "/" + serverId)
        .then()
            .statusCode(204);

        // Verify it's deleted
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get(SERVERS_ENDPOINT + "/" + serverId)
        .then()
            .statusCode(404);
    }

    @Test
    void testCreateServerWithoutAuth() {
        String createServerPayload = """
            {
                "name": "Unauthorized Server",
                "description": "Should fail"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT)
        .then()
            .statusCode(401);
    }

    @Test
    void testCreateServerWithInvalidData() {
        String createServerPayload = """
            {
                "name": "",
                "description": "Invalid server"
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(createServerPayload)
        .when()
            .post(SERVERS_ENDPOINT)
        .then()
            .statusCode(400);
    }
}
