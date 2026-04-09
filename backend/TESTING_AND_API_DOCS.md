# API Documentation and Testing Guide

## OpenAPI/Swagger Documentation

### Accessing the API Documentation

Once the application is running, you can access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8080/q/swagger-ui`
- **OpenAPI JSON**: `http://localhost:8080/q/openapi`
- **OpenAPI YAML**: `http://localhost:8080/q/openapi?format=yaml`


## Integration Testing

### Prerequisites

The integration tests use **Testcontainers** to automatically manage dependency containers during test execution. This means:

1. **Docker Desktop** must be installed and running
2. No manual database setup is needed
3. Tests are isolated and don't interfere with your development database

### Running Tests

#### Run all tests:
```bash
cd backend
mvn test
```

#### Run specific test class:
```bash
mvn test -Dtest=AuthResourceTest
```

#### Run specific test method:
```bash
mvn test -Dtest=AuthResourceTest#testRegisterSuccess
```

#### Run tests with coverage:
```bash
mvn test jacoco:report
# Coverage report: target/site/jacoco/index.html
```

### Test Structure

The project includes comprehensive integration tests for all API endpoints:

1. **AuthResourceTest** (5 tests)
   - User registration with valid/invalid data
   - User login with correct/incorrect credentials
   - Duplicate username prevention

2. **ServerResourceTest** (6 tests)
   - Create server
   - Get all servers
   - Get specific server
   - Delete server (with permissions check)
   - Unauthorized access handling
   - Invalid data validation

3. **ChannelResourceTest** (6 tests)
   - Create channel
   - Get all channels
   - Delete channel
   - Unauthorized access handling
   - Empty name validation
   - Non-existent server handling

4. **MessageResourceTest** (7 tests)
   - Send message
   - Get messages with limit
   - Get messages with timestamp filter
   - Delete message
   - Empty message validation
   - Message length validation
   - Unauthorized access handling

### What the Tests Validate

- ✅ HTTP status codes (201, 200, 204, 400, 401, 403, 404)
- ✅ Request/response schemas with proper JSON structure
- ✅ Authentication and authorization (JWT tokens)
- ✅ Rate limiting behavior
- ✅ Input validation and error handling
- ✅ Database persistence across requests
- ✅ User permissions (owner vs member)

### Test Execution Flow

Each test class:
1. Uses `@QuarkusTestResource(TestContainersLifecycleManager.class)` to manage containers
2. Automatically creates database instances
3. Seeds test data (users, servers, channels) in the `@BeforeEach` setup
4. Executes REST calls using REST Assured
5. Verifies responses using Hamcrest matchers
6. Cleans up containers after all tests

### Example Test Output

```
[INFO] Running com.resonant.resource.AuthResourceTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.345 s

[INFO] Running com.resonant.resource.ServerResourceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.890 s

[INFO] Running com.resonant.resource.ChannelResourceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.567 s

[INFO] Running com.resonant.resource.MessageResourceTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.789 s

[INFO] Total: 24 tests passed
```

---

## Troubleshooting

### "Connection refused" on first test run
- **Cause**: Testcontainers is downloading the Docker image
- **Solution**: Wait for the first test run to complete. Subsequent runs will be faster.

### "Docker daemon is not running"
- **Cause**: Docker Desktop is not running
- **Solution**: Start Docker Desktop and retry

### "Port already in use"
- **Cause**: Another service is using port 5432 or 6379
- **Solution**: Stop conflicting services or change ports in TestContainersLifecycleManager


---

## API Documentation Resources

### Rate Limiting
- **Messages**: 10 requests per 60 seconds
- **Channels**: 5 requests per 60 seconds
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Authentication
- All endpoints except `/api/auth/*` require JWT Bearer token
- Header format: `Authorization: Bearer <token>`
- Token issued on successful login/registration

### Error Responses
All errors follow this format:
```json
{
  "error": "Description of the error"
}
```

### Status Codes
- `200 OK`: Successful GET/POST
- `201 Created`: Resource created
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Next Steps

1. **Run Tests**: `mvn test` to verify API functionality
2. **Explore Swagger UI**: Visit `http://localhost:8080/q/swagger-ui` when server is running
3. **Add More Tests**: Extend test coverage for edge cases
4. **Load Testing**: Add performance tests with tools like JMeter or Gatling
