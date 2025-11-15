#!/bin/bash

# Health Check Script
# Usage: ./scripts/health-check.sh [environment]

set -e

ENVIRONMENT=${1:-development}

echo "🔍 Checking health of $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Invalid environment. Use: development, staging, or production"
    exit 1
fi

# Set health check URL based on environment
case $ENVIRONMENT in
    development)
        HEALTH_URL="http://localhost:3000/health"
        ;;
    staging)
        HEALTH_URL="https://staging-api.yourdomain.com/health"
        ;;
    production)
        HEALTH_URL="https://api.yourdomain.com/health"
        ;;
esac

echo "🌐 Checking health at: $HEALTH_URL"

# Check health endpoint
if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ Health check passed!"
    
    # Get detailed health info
    echo "📊 Health details:"
    curl -s "$HEALTH_URL" | jq '.' 2>/dev/null || curl -s "$HEALTH_URL"
    
else
    echo "❌ Health check failed!"
    echo "🔍 Troubleshooting steps:"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "1. Check if Docker containers are running:"
        echo "   docker-compose ps"
        echo ""
        echo "2. Check application logs:"
        echo "   docker-compose logs app"
        echo ""
        echo "3. Check if port 3000 is available:"
        echo "   netstat -tulpn | grep :3000"
    else
        echo "1. Check if PM2 processes are running:"
        echo "   pm2 status"
        echo ""
        echo "2. Check application logs:"
        echo "   pm2 logs"
        echo ""
        echo "3. Check if the service is accessible:"
        echo "   curl -I $HEALTH_URL"
    fi
    
    exit 1
fi
