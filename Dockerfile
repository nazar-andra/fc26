# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
# No runtime dependencies; keep this stage minimal for future use.

# ---- Runtime stage ----
FROM node:20-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3004 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

# Copy application source
COPY --from=build /app/package.json ./package.json
COPY server.js ./
COPY app.js ./
COPY index.html ./
COPY styles.css ./

# Seed data (copied into the volume on first run by the entrypoint)
COPY data/ /app/data-seed/

# Data directory (mounted as a volume at runtime)
RUN mkdir -p /app/data

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as non-root user for security
RUN groupadd -r app && useradd -r -g app -m -d /app app \
    && chown -R app:app /app

EXPOSE 3004

ENTRYPOINT ["docker-entrypoint.sh"]
