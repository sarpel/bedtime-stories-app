# Multi-stage build for bedtime-stories-app
# Stage 1: Builder
FROM node:20.16.0-bookworm-slim AS builder

WORKDIR /app

# OS deps for native modules (better-sqlite3)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    g++ \
    git \
    make \
    python3 \
  && rm -rf /var/lib/apt/lists/*

# Copy manifest files first for better cache
COPY package.json package-lock.json .npmrc .nvmrc ./
COPY backend/package.json backend/package.json

# Install workspace deps (clean, reproducible)
RUN npm ci

# Copy source
COPY . .

# Build frontend (generates dist)
RUN npm run build:production

# Stage 2: Runtime
FROM node:20.16.0-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# OS deps minimal; keep CA certs
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    dumb-init \
  && rm -rf /var/lib/apt/lists/*

# Copy manifests for prod install
COPY package.json package-lock.json .npmrc .nvmrc ./
COPY backend/package.json backend/package.json

# Install only production deps (workspace aware)
RUN npm ci --omit=dev

# Copy built assets & backend code
COPY --from=builder /app/dist dist
COPY --from=builder /app/index.html ./
COPY --from=builder /app/backend backend
# Audio directory persistence placeholder
RUN mkdir -p backend/audio

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(r.ok)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))" || exit 1

CMD ["dumb-init","node","backend/server.js"]
