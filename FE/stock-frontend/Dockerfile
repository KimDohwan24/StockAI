# =========================================================================
# Stage 1: Build Stage
# =========================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
# Clean install ensures repeatable builds
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Accept NEXT_PUBLIC_API_BASE_URL as a build-time argument
# (Crucial: Next.js injects NEXT_PUBLIC_ env vars into client bundles during build)
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Disable Next.js telemetry during build (performance/privacy)
ENV NEXT_TELEMETRY_DISABLED=1

# Compile Next.js production build
RUN npm run build

# =========================================================================
# Stage 2: Production Runtime Stage
# =========================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Ensure we run in production mode
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root system user for container security hardening
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package configurations and node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled Next.js build and static files with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to the non-root user
USER nextjs

# Expose default Next.js port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start Next.js in production mode
CMD ["npm", "run", "start"]
