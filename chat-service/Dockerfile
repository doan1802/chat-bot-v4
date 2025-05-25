# Optimized Production Dockerfile with Cluster Support
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --only=production --silent && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy source code
COPY --chown=nodejs:nodejs ./src ./src

# Set NODE_ENV for production optimizations
ENV NODE_ENV=production
# Tăng memory cho cluster mode (master + workers)
ENV NODE_OPTIONS="--max-old-space-size=768"
# Default cluster workers (có thể override từ docker-compose)
ENV CLUSTER_WORKERS=2

USER nodejs

EXPOSE 3004

# Health check tối ưu cho cluster
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# Sử dụng node thay vì pm2 để tránh overhead
CMD ["node", "src/server.js"]
