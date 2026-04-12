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
    git bash \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV CABINET_DATA_DIR=/data

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Daemon and its dependencies
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/node-pty ./node_modules/node-pty
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/simple-git ./node_modules/simple-git
COPY --from=builder /app/node_modules/node-cron ./node_modules/node-cron
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder /app/node_modules/chokidar ./node_modules/chokidar
COPY --from=builder /app/node_modules/gray-matter ./node_modules/gray-matter
COPY --from=builder /app/node_modules/js-yaml ./node_modules/js-yaml

# Agent library templates
COPY --from=builder /app/data/.agents/.library ./data-defaults/.agents/.library
# Default getting-started pages
COPY --from=builder /app/data/getting-started ./data-defaults/getting-started
COPY --from=builder /app/data/index.md ./data-defaults/index.md

# Startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000 3001

VOLUME /data

ENTRYPOINT ["./docker-entrypoint.sh"]
