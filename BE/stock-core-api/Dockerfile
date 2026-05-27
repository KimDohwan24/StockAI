# =========================================================================
# Runtime Stage (Minimal Temurin JRE 17)
# =========================================================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root system user for security hardening
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy only the pre-built executable JAR file from the host build directory
COPY --chown=spring:spring build/libs/*-SNAPSHOT.jar app.jar

# Spring Boot default port
EXPOSE 8080

# Performance-tuned JVM flags for container environments
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:+UseContainerSupport", "-jar", "app.jar"]
