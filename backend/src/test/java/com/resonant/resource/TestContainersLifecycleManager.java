package com.resonant.resource;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import io.restassured.RestAssured;
import io.restassured.config.SSLConfig;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
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

        // Configure RestAssured to trust the self-signed certificate for tests
        try {
            // The path to server.crt relative to the backend project root.
            // This assumes the test is run from the 'backend' directory.
            File certFile = new File("certs/server.crt");

            // Fallback for different execution contexts (e.g., running from the monorepo root)
            if (!certFile.exists()) {
                certFile = new File("backend/certs/server.crt");
            }
            
            if (!certFile.exists()) {
                throw new java.io.FileNotFoundException("server.crt not found at expected paths. Tried: " + 
                                                      new File("certs/server.crt").getAbsolutePath() + " and " +
                                                      new File("backend/certs/server.crt").getAbsolutePath() + 
                                                      ". Ensure 'generate-keys.sh' (or .ps1) has been run from the backend directory.");
            }

            KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
            trustStore.load(null, null); // Initialize empty trust store

            try (InputStream fis = new FileInputStream(certFile)) {
                CertificateFactory cf = CertificateFactory.getInstance("X.509");
                X509Certificate cert = (X509Certificate) cf.generateCertificate(fis);
                trustStore.setCertificateEntry("selfsigned", cert);
            }

            RestAssured.config = RestAssured.config().sslConfig(
                new SSLConfig().trustStore(trustStore)
            );

            // Set the default SSLContext so WebSocket clients and other HTTP clients trust the cert
            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(trustStore);
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, tmf.getTrustManagers(), null);
            SSLContext.setDefault(sslContext);
            
            System.out.println("RestAssured configured to trust self-signed certificate from: " + certFile.getAbsolutePath());

        } catch (Exception e) {
            System.err.println("WARNING: Failed to configure RestAssured SSL for tests. Tests might fail with SSL errors if backend uses HTTPS: " + e.getMessage());
            e.printStackTrace();
        }

        Map<String, String> props = new HashMap<>();
        props.put("quarkus.datasource.jdbc.url", postgres.getJdbcUrl());
        props.put("quarkus.datasource.username", "resonant");
        props.put("quarkus.datasource.password", "resonant");
        props.put("quarkus.redis.hosts", "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379));
        
        props.put("quarkus.http.insecure-requests", "enabled"); // Allow RestAssured to connect to HTTP if needed

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
