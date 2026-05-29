# =========================================================================
# Build Stage (Compile Spring Boot Application)
# =========================================================================
FROM gradle:8-jdk17 AS builder
WORKDIR /build

# Copy gradle files and settings
COPY gradle/ gradle/
COPY gradlew build.gradle settings.gradle ./

# Copy source code and build the JAR
COPY src src
RUN ./gradlew bootJar --no-daemon

# =========================================================================
# Runtime Stage (Minimal Temurin JRE 17)
# =========================================================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root system user for security hardening
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy only the compiled JAR file from the builder stage
COPY --from=builder --chown=spring:spring /build/build/libs/*-SNAPSHOT.jar app.jar

# Spring Boot default port
EXPOSE 8080

# Performance-tuned JVM flags for container environments
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:+UseContainerSupport", "-jar", "app.jar"]
