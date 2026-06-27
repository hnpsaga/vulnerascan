# Multi-stage build for production-ready VulneraScan
# Stage 1: Build the CLI and the Dashboard
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first to leverage build cache
COPY package.json package-lock.json ./
COPY dashboard/package.json dashboard/package-lock.json ./dashboard/

# Install dependencies (both root package and dashboard frontend)
RUN npm ci && npm ci --prefix dashboard

# Copy the rest of the source code
COPY . .

# Build the production dashboard and compile TypeScript CLI source
RUN npm run build

# Stage 2: Minimal runtime image
FROM node:20-alpine

WORKDIR /app

# Install git since scans might need it for VCS details, and install pnpm globally for package resolution support
RUN apk add --no-cache git && \
    npm install -g pnpm && \
    npm cache clean --force

# Copy only the package manifests and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Symlink the binary globally so it is available in the system PATH
RUN npm link

# Environment variables configuration
ENV VULNERASCAN_HOME=/root
ENV VULNERASCAN_HOST=0.0.0.0
ENV PORT=4000

# Expose port for the dashboard server
EXPOSE 4000

# Configure persistent workspace directory
VOLUME ["/root/.vulnerascan"]

# Set default directory to project mount path
WORKDIR /project

# Container configuration for execution
ENTRYPOINT ["vulnerascan"]
CMD ["--help"]
