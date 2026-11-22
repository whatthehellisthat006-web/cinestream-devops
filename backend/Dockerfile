# ==============================================================================
# CineStream Backend - Multi-stage Dockerfile (Atelier 3)
# Explicit tags | Non-root user | HEALTHCHECK
# ==============================================================================

# Stage 1: Build JAR with Maven & Java 17
FROM maven:3.9.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal non-root JRE runtime
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

# Install wget for container HEALTHCHECK
RUN apk add --no-cache wget

# Create dedicated non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /build/target/*.jar app.jar

USER appuser

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
