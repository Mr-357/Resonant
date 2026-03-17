package com.resonant.resource;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import java.util.HashMap;
import java.util.Map;

public class TestContainersLifecycleManager implements QuarkusTestResourceLifecycleManager {

    private PostgreSQLContainer<?> postgres;
    private GenericContainer<?> redis;

    @Override
    public Map<String, String> start() {
        postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
            .withDatabaseName("resonant")
            .withUsername("resonant")  
            .withPassword("resonant")
            .withReuse(false);
        
        postgres.start();

        redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379)
            .waitingFor(Wait.forListeningPort())
            .withReuse(false);
        
        redis.start();

        Map<String, String> props = new HashMap<>();
        props.put("quarkus.datasource.jdbc.url", postgres.getJdbcUrl());
        props.put("quarkus.datasource.username", "resonant");
        props.put("quarkus.datasource.password", "resonant");
        props.put("quarkus.redis.hosts", "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379));
        
        return props;
    }

    @Override
    public void stop() {
        if (postgres != null) {
            postgres.stop();
        }
        if (redis != null) {
            redis.stop();
        }
    }
}
