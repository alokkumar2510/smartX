# Mediasoup requires build tools for native bindings
FROM node:20-bookworm-slim

WORKDIR /app

# Build tools needed by mediasoup native module
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    libssl-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for layer caching
COPY package*.json ./

# Install with native compilation
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["node", "src/index.js"]
