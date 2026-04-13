# Stage 1: Install dependencies (full image for native build tools)
FROM node:20 AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && \
    npm rebuild better-sqlite3 node-pty

# Stage 2: Build Next.js
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Stage 3: Production runtime
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV CABINET_DATA_DIR=/data

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Daemon files — kept in image for extraction to host via `docker cp`
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Agent library templates
COPY --from=builder /app/data/.agents/.library ./data-defaults/.agents/.library
# Default getting-started pages
COPY --from=builder /app/data/getting-started ./data-defaults/getting-started
COPY --from=builder /app/data/index.md ./data-defaults/index.md

# Startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

VOLUME /data

ENTRYPOINT ["./docker-entrypoint.sh"]
