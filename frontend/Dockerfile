# ==============================================================================
# CineStream Frontend - Multi-stage Dockerfile (Atelier 3)
# Explicit tags | Non-root nginx-unprivileged user | HEALTHCHECK
# ==============================================================================

# Stage 1: Build Angular 22 production bundle
FROM node:24.15.0-alpine AS builder
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Unprivileged Nginx runtime (runs as non-root UID 101 on port 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist/frontend/browser /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
