# Production Dockerfile (Optimized for high volume)
FROM node:22-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files first (for better layer caching)
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY libs/ ./libs/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Verify dist directory exists
RUN ls -la dist/ || (echo "Build failed - dist directory not found" && exit 1)

# Remove source code and build tools (but keep dist/ and prisma/ for runtime)
RUN rm -rf src/ libs/ tsconfig*.json nest-cli.json

# Reinstall production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Regenerate Prisma client with production dependencies
RUN npx prisma generate

# Verify dist/src/main.js exists (NestJS preserves src/ structure)
RUN ls -la dist/src/main.js || (echo "dist/src/main.js not found" && exit 1)

# Verify Prisma client was generated
RUN ls -la node_modules/.prisma/client || (echo "Prisma client not found" && exit 1)

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application with Node.js optimizations for high volume
# --max-old-space-size: Increase heap for high volume processing (2.5GB for API + workers)
# --expose-gc: Enable manual garbage collection
CMD ["node", "--max-old-space-size=2560", "--expose-gc", "dist/src/main.js"]
