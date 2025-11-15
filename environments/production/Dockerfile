# Production Dockerfile (Optimized for high volume)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies (production only)
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY libs/ ./libs/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Remove source code and dev dependencies
RUN rm -rf src/ libs/ prisma/ node_modules/
RUN npm ci --only=production && npm cache clean --force

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

# Start application
CMD ["node", "dist/main.js"]
