# Staging Environment

This directory contains the staging environment configuration for testing and integration.

## Quick Start

### Using Docker

```bash
# Start staging environment
cd environments/staging
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop environment
docker-compose down
```

### Using PM2 (cPanel/WHM)

```bash
# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Stop
pm2 stop all
```

## Environment Details

- **Port**: 3001 (Docker) / 3000 (PM2)
- **URL**: https://staging-api.yourdomain.com
- **Database**: PostgreSQL on port 5433 (Docker) / 5432 (PM2)
- **Redis**: Redis on port 6380 (Docker) / 6379 (PM2)
- **Admin Tools**: Adminer on port 8083

## Environment Variables

The staging environment uses `.env` file with the following key settings:

- `NODE_ENV=staging`
- `DATABASE_URL=postgresql://sfuser_staging:password@localhost:5432/sfapi_staging`
- `REDIS_URL=redis://localhost:6379/1`
- Salesforce endpoints point to staging/sandbox environment
- Moderate rate limiting for testing

## Staging Features

- **Production-like Setup**: Similar to production but with test data
- **Staging APIs**: Points to Salesforce staging environment
- **Moderate Rate Limits**: Balanced limits for testing
- **Health Monitoring**: Health check endpoints
- **Logging**: Structured logging for debugging

## Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Create staging database user
psql -U postgres -c "CREATE USER sfuser_staging WITH PASSWORD 'staging_password';"
psql -U postgres -c "CREATE DATABASE sfapi_staging OWNER sfuser_staging;"
```

## SSL Certificate Setup

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d staging-api.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

## Monitoring

### Health Checks

```bash
# Application health
curl https://staging-api.yourdomain.com/health

# Queue health
curl https://staging-api.yourdomain.com/queue/monitor/health
```

### PM2 Monitoring

```bash
# Check status
pm2 status

# View logs
pm2 logs sf-middleware-staging

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart sf-middleware-staging
```

## Testing

### API Testing

```bash
# Test token endpoint
curl -H "x-api-key: sk_test_staging_123" \
     https://staging-api.yourdomain.com/v1/salesforce/token

# Test pledge endpoint
curl -X POST \
     -H "x-api-key: sk_test_staging_123" \
     -H "Content-Type: application/json" \
     -d '{"payload": {"test": "data"}, "token": "test_token"}' \
     https://staging-api.yourdomain.com/v1/salesforce/pledge
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Make sure ports 3001, 5433, 6380 are available
2. **SSL Issues**: Check certificate validity and nginx configuration
3. **Database Connection**: Verify database credentials and connectivity
4. **Redis Connection**: Check Redis service status

### Logs

```bash
# Application logs
docker-compose logs app

# Database logs
docker-compose logs postgres

# Redis logs
docker-compose logs redis

# PM2 logs
pm2 logs sf-middleware-staging
```

## Deployment

### Docker Deployment

```bash
# Build and deploy
docker-compose up -d --build

# Update application
docker-compose pull
docker-compose up -d
```

### PM2 Deployment

```bash
# Deploy new version
pm2 stop all
npm run build
pm2 start ecosystem.config.js
pm2 save
```
