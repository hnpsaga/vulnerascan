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

# Define build arguments for OCI metadata
ARG TITLE="vulnerascan"
ARG DESCRIPTION="Developer-first vulnerability scanner for modern software projects."
ARG SOURCE="https://github.com/hnpsaga/vulnerascan"
ARG DOCUMENTATION="https://github.com/hnpsaga/vulnerascan#readme"
ARG LICENSES="MIT"
ARG VERSION="0.0.3"
ARG REVISION="unknown"
ARG VENDOR="Hari Naga Praveen Saga"
ARG AUTHORS="Hari Naga Praveen Saga"
ARG CREATED=""

# Apply OCI labels to the image
LABEL org.opencontainers.image.title="${TITLE}" \
      org.opencontainers.image.description="${DESCRIPTION}" \
      org.opencontainers.image.source="${SOURCE}" \
      org.opencontainers.image.documentation="${DOCUMENTATION}" \
      org.opencontainers.image.licenses="${LICENSES}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.vendor="${VENDOR}" \
      org.opencontainers.image.authors="${AUTHORS}" \
      org.opencontainers.image.created="${CREATED}"

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
