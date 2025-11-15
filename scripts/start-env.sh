#!/bin/bash

# Start Environment Script
# Usage: ./scripts/start-env.sh [environment] [method]

set -e

ENVIRONMENT=${1:-development}
METHOD=${2:-docker}

echo "🚀 Starting $ENVIRONMENT environment using $METHOD method..."

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
    echo "🐳 Starting with Docker..."
    docker-compose up -d
    
    echo "✅ Environment started!"
    echo "📊 Status:"
    docker-compose ps
    
elif [ "$METHOD" = "pm2" ]; then
    echo "⚡ Starting with PM2..."
    pm2 start ecosystem.config.js
    
    echo "✅ Environment started!"
    echo "📊 Status:"
    pm2 status
fi
