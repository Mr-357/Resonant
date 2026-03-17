package com.resonant.resource;

import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@QuarkusTestResource(TestContainersLifecycleManager.class)
class AuthResourceTest {

    private static final String BASE_URL = "http://localhost:8081/api/auth";
    private static final String REGISTER_ENDPOINT = BASE_URL + "/register";
    private static final String LOGIN_ENDPOINT = BASE_URL + "/login";

    @BeforeEach
    void setup() {
        // Reset any test data if needed
    }

    @Test
    void testRegisterSuccess() {
        String registerPayload = """
            {
                "username": "testuser",
                "email": "testuser@example.com",
                "password": "TestPassword123!"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(REGISTER_ENDPOINT)
        .then()
            .statusCode(201)
            .body("username", equalTo("testuser"))
            .body("userId", notNullValue())
            .body("token", notNullValue());
    }

    @Test
    void testRegisterWithInvalidData() {
        String registerPayload = """
            {
                "username": "",
                "email": "invalid-email",
                "password": "short"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(REGISTER_ENDPOINT)
        .then()
            .statusCode(400)
            .body("error", notNullValue());
    }

    @Test
    void testLogin() {
        // First register a user
        String registerPayload = """
            {
                "username": "logintest",
                "email": "logintest@example.com",
                "password": "LoginPassword123!"
            }
            """;

        Response registerResponse = given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(REGISTER_ENDPOINT);

        assertEquals(201, registerResponse.statusCode());

        // Now test login
        String loginPayload = """
            {
                "username": "logintest",
                "password": "LoginPassword123!"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(loginPayload)
        .when()
            .post(LOGIN_ENDPOINT)
        .then()
            .statusCode(200)
            .body("username", equalTo("logintest"))
            .body("token", notNullValue());
    }

    @Test
    void testLoginWithInvalidCredentials() {
        String loginPayload = """
            {
                "username": "nonexistentuser",
                "password": "WrongPassword123!"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(loginPayload)
        .when()
            .post(LOGIN_ENDPOINT)
        .then()
            .statusCode(401)
            .body("error", notNullValue());
    }

    @Test
    void testRegisterDuplicateUsername() {
        String registerPayload = """
            {
                "username": "duplicateuser",
                "email": "duplicate1@example.com",
                "password": "Password123!"
            }
            """;

        // First registration should succeed
        given()
            .contentType(ContentType.JSON)
            .body(registerPayload)
        .when()
            .post(REGISTER_ENDPOINT)
        .then()
            .statusCode(201);

        // Second registration with same username should fail
        String duplicatePayload = """
            {
                "username": "duplicateuser",
                "email": "duplicate2@example.com",
                "password": "Password123!"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(duplicatePayload)
        .when()
            .post(REGISTER_ENDPOINT)
        .then()
            .statusCode(400)
            .body("error", notNullValue());
    }
}
