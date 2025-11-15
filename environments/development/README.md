# Development Environment

This directory contains the development environment configuration for local development.

## Quick Start

### Using Docker (Recommended)

```bash
# Start development environment
cd environments/development
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop environment
docker-compose down
```

### Using PM2 (Alternative)

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

- **Port**: 3000
- **Database**: PostgreSQL on port 5432
- **Redis**: Redis on port 6379
- **Admin Tools**: 
  - Adminer: http://localhost:8081
  - Redis Commander: http://localhost:8082

## Environment Variables

The development environment uses `.env` file with the following key settings:

- `NODE_ENV=development`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sfapi_dev`
- `REDIS_URL=redis://localhost:6379/0`
- Salesforce endpoints point to sandbox/test environment
- Rate limiting is more lenient for development

## Development Features

- **Hot Reload**: Code changes automatically restart the application
- **Debug Logging**: Verbose logging for debugging
- **Admin Tools**: Database and Redis admin interfaces
- **Relaxed Rate Limits**: Higher limits for testing
- **Sandbox APIs**: Points to Salesforce test environment

## Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed database (if needed)
npx prisma db seed

# View database
open http://localhost:8081
```

## Testing

```bash
# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Redis Connection Issues
```bash
# Check Redis status
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```
