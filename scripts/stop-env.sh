#!/bin/bash

# Stop Environment Script
# Usage: ./scripts/stop-env.sh [environment] [method]

set -e

ENVIRONMENT=${1:-development}
METHOD=${2:-docker}

echo "🛑 Stopping $ENVIRONMENT environment using $METHOD method..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Invalid environment. Use: development, staging, or production"
    exit 1
fi

# Validate method
if [[ ! "$METHOD" =~ ^(docker|pm2)$ ]]; then
    echo "❌ Invalid method. Use: docker or pm2"
    exit 1
fi

# Change to environment directory
cd "environments/$ENVIRONMENT"

if [ "$METHOD" = "docker" ]; then
    echo "🐳 Stopping Docker containers..."
    docker-compose down
    
    echo "✅ Environment stopped!"
    
elif [ "$METHOD" = "pm2" ]; then
    echo "⚡ Stopping PM2 processes..."
    pm2 stop all
    pm2 delete all
    
    echo "✅ Environment stopped!"
fi
