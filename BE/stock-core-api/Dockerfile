# =========================================================================
# Stage 1: Build Stage (Gradle & OpenJDK 17)
# =========================================================================
FROM gradle:8.8-jdk17-alpine AS builder
WORKDIR /app

# Copy gradle wrapper and configuration files first to cache dependencies
COPY gradle gradle
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .

# Grant execution rights on the Gradle wrapper (crucial on Windows/WSL checkouts)
RUN chmod +x gradlew

# Pre-download dependencies to leverage Docker layer caching
RUN ./gradlew dependencies --no-daemon || true

# Copy the application source code
COPY src src

# Build the Spring Boot application bootJar (skipping tests for speed in CI/CD)
RUN ./gradlew bootJar -x test --no-daemon

# =========================================================================
# Stage 2: Runtime Stage (Minimal Temurin JRE 17)
# =========================================================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root system user for security hardening
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy only the built executable JAR file from the builder stage
COPY --from=builder --chown=spring:spring /app/build/libs/*-SNAPSHOT.jar app.jar

# Spring Boot default port
EXPOSE 8080

# Performance-tuned JVM flags for container environments
# -XX:+UseG1GC: Standard modern garbage collector
# -XX:+UseContainerSupport: Ensures JVM respects Docker memory limits
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:+UseContainerSupport", "-jar", "app.jar"]
