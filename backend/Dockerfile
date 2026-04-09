# Stage 1: Build
FROM maven:3.9-eclipse-temurin-25 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src src
RUN mvn clean package -DskipTests
# Generate a private key
RUN openssl genrsa -out rsaPrivateKey.pem 2048

# Convert to PKCS#8 (This is the critical step for SmallRye JWT)
RUN openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in rsaPrivateKey.pem -out privateKey.pem

# Generate the corresponding public key
RUN openssl rsa -in rsaPrivateKey.pem -pubout -outform PEM -out publicKey.pem
RUN mkdir -p certs
RUN openssl genpkey -algorithm RSA -out certs/server.key -pkeyopt rsa_keygen_bits:2048
RUN openssl req -new -x509 -nodes -days 365 -keyout certs/server.key -out certs/server.crt -subj "/C=US/ST=State/L=City/O=Resonant/OU=Development/CN=localhost"

# Stage 2: Runtime (JVM mode)
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/quarkus-app/lib/ lib/
COPY --from=builder /build/target/quarkus-app/*.jar .
COPY --from=builder /build/target/quarkus-app/app/ app/
COPY --from=builder /build/target/quarkus-app/quarkus/ quarkus/
COPY --from=builder /build/privateKey.pem keys/privateKey.pem
COPY --from=builder /build/publicKey.pem keys/publicKey.pem
COPY --from=builder /build/certs/server.key certs/server.key
COPY --from=builder /build/certs/server.crt certs/server.crt
EXPOSE 8080
EXPOSE 8443

ENTRYPOINT [ "java", "-jar", "quarkus-run.jar" ]
