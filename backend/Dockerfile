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

# Stage 2: Runtime (JVM mode)
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/quarkus-app/lib/ lib/
COPY --from=builder /build/target/quarkus-app/*.jar .
COPY --from=builder /build/target/quarkus-app/app/ app/
COPY --from=builder /build/target/quarkus-app/quarkus/ quarkus/
COPY --from=builder /build/privateKey.pem .
COPY --from=builder /build/publicKey.pem .

EXPOSE 8080

ENTRYPOINT [ "java", "-jar", "quarkus-run.jar" ]
