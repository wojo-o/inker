# Multi-stage production Dockerfile for Inker Backend (Bun Runtime)

# Stage 1: Install dependencies
FROM oven/bun:1-alpine AS install

WORKDIR /app

# Install OpenSSL 3.x compatible libraries for Prisma and Node.js for prisma generate (bunx crashes)
RUN apk add --no-cache openssl libssl3 nodejs npm

# Copy package files and Prisma schema
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install production dependencies
RUN bun install --production --frozen-lockfile

# Generate Prisma Client using npx (bunx has segfault issues with Prisma)
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

# Stage 2: Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install OpenSSL 3.x compatible libraries for Prisma and Node.js for prisma generate
RUN apk add --no-cache openssl libssl3 nodejs npm

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client using npx (bunx has segfault issues)
COPY prisma ./prisma/
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

# Copy source code
COPY . .

# Build application (NestJS build)
RUN bun run build

# Stage 3: Production
FROM oven/bun:1-alpine AS production

# Install dumb-init, wget, OpenSSL, and Chromium for Puppeteer
RUN apk add --no-cache \
    dumb-init \
    wget \
    openssl \
    libssl3 \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create non-root user
RUN addgroup -g 1001 -S bunjs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Copy production dependencies from install stage
COPY --from=install /app/node_modules ./node_modules

# Copy Prisma schema and generated client
COPY --chown=nestjs:bunjs prisma ./prisma/
COPY --from=install /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=install /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:bunjs /app/dist ./dist

# Copy entrypoint script
COPY --chown=nestjs:bunjs docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Create ALL required directories
RUN mkdir -p /app/uploads/screens /app/uploads/firmware /app/uploads/widgets /app/uploads/captures /app/uploads/drawings /app/logs /app/assets/fonts && \
    chown -R nestjs:bunjs /app/uploads /app/logs /app/assets

# Copy font files for Puppeteer rendering
COPY --chown=nestjs:bunjs ./assets/fonts /app/assets/fonts

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3002/api/health || exit 1

# Use dumb-init to handle signals properly, with entrypoint script
ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]

# Start application with Bun
CMD ["bun", "run", "dist/main.js"]
