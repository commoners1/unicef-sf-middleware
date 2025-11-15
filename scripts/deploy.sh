#!/bin/bash

# Multi-Environment Deployment Script
# Usage: ./scripts/deploy.sh [environment] [method]
# Example: ./scripts/deploy.sh production docker

set -e

ENVIRONMENT=${1:-development}
METHOD=${2:-docker}

echo "🚀 Deploying to $ENVIRONMENT environment using $METHOD method..."

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

# Build application
echo "📦 Building application..."
cd ../../
npm install
npm run build
cd "environments/$ENVIRONMENT"

# Deploy based on method
if [ "$METHOD" = "docker" ]; then
    echo "🐳 Deploying with Docker..."
    
    # Stop existing containers
    docker-compose down || true
    
    # Build and start
    docker-compose up -d --build
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 30
    
    # Check health
    if [ "$ENVIRONMENT" = "development" ]; then
        HEALTH_URL="http://localhost:3000/health"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        HEALTH_URL="http://localhost:3001/health"
    else
        HEALTH_URL="http://localhost:3000/health"
    fi
    
    echo "🔍 Checking health at $HEALTH_URL..."
    curl -f "$HEALTH_URL" || {
        echo "❌ Health check failed"
        docker-compose logs
        exit 1
    }
    
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at: $HEALTH_URL"
    
elif [ "$METHOD" = "pm2" ]; then
    echo "⚡ Deploying with PM2..."
    
    # Stop existing processes
    pm2 stop all || true
    pm2 delete all || true
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 30
    
    # Check health
    if [ "$ENVIRONMENT" = "development" ]; then
        HEALTH_URL="http://localhost:3000/health"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        HEALTH_URL="https://staging-api.yourdomain.com/health"
    else
        HEALTH_URL="https://api.yourdomain.com/health"
    fi
    
    echo "🔍 Checking health at $HEALTH_URL..."
    curl -f "$HEALTH_URL" || {
        echo "❌ Health check failed"
        pm2 logs
        exit 1
    }
    
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at: $HEALTH_URL"
fi

# Show status
echo "📊 Current status:"
if [ "$METHOD" = "docker" ]; then
    docker-compose ps
else
    pm2 status
fi

echo "🎉 Deployment completed successfully!"
