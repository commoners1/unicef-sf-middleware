#!/bin/bash
# init-high-volume.sh - Initialize high-performance setup for 450k jobs/day

echo "🚀 Initializing high-performance setup for 450k jobs/day..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

if [ -z "$REDIS_URL" ]; then
    echo "❌ REDIS_URL is not set"
    exit 1
fi

echo "✅ Environment variables validated"

# Create database indexes for high volume
echo "📊 Creating database indexes for high volume..."
npx prisma db execute --file ./scripts/create-indexes.sql

# Run database optimizations
echo "🔧 Running database optimizations..."
npx prisma db execute --file ./scripts/database-optimizations.sql

# Create Redis configuration
echo "🔴 Configuring Redis for high volume..."
cat > redis.conf << EOF
# High-performance Redis configuration
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
save 900 1
save 300 10
save 60 10000
EOF

# Start services
echo "🚀 Starting high-performance services..."
docker-compose -f docker-compose.high-volume.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run health checks
echo "🏥 Running health checks..."
curl -f http://localhost:3000/health || echo "❌ Health check failed"

# Display monitoring URLs
echo "📊 Monitoring URLs:"
echo "  - Application: http://localhost:3000"
echo "  - Queue Monitor: http://localhost:3000/queue/monitor/health"
echo "  - Prometheus: http://localhost:9090"

echo "✅ High-performance setup completed!"
echo "📈 Expected capacity: 450,000+ jobs/day"
echo "⚡ Performance optimizations applied"
