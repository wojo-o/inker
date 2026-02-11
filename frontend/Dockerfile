# Multi-stage production Dockerfile for React frontend with Bun

# Stage 1: Build with Bun for faster installs and builds
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files (bun.lock for faster, reproducible installs)
COPY package.json bun.lock* ./

# Install dependencies with frozen lockfile for reproducibility
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Accept build arg for backend public URL
ARG VITE_BACKEND_PUBLIC_URL
ENV VITE_BACKEND_PUBLIC_URL=$VITE_BACKEND_PUBLIC_URL

# Build the application using Bun runtime
RUN bun run build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Install curl for healthcheck (wget not available in nginx:alpine)
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail --silent http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
