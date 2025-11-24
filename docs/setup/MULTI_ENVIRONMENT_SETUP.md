# Multi-Environment Setup Guide

This guide covers setting up and managing multiple environments (development, staging, production) for the SF Middleware application.

## 🏗️ Architecture Overview

```
environments/
├── development/          # Local development
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── ecosystem.config.js
│   ├── nginx.conf
│   ├── env.template
│   └── README.md
├── staging/             # Testing environment
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── ecosystem.config.js
│   ├── nginx.conf
│   ├── env.template
│   └── README.md
├── production/          # Live production
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── ecosystem.config.js
│   ├── nginx.conf
│   ├── prometheus.yml
│   ├── env.template
│   └── README.md
├── production2/        # Secondary production environment
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── ecosystem.config.js
│   └── prometheus.yml
└── shared/              # Shared configurations
    └── config/
        └── configuration.ts
```

## 🚀 Quick Start

### Development Environment

```bash
# Using Docker (Recommended)
cd environments/development
cp env.template .env
# Edit .env with your values
docker-compose up -d

# Using PM2
cd environments/development
cp env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

### Staging Environment

```bash
# Using Docker
cd environments/staging
cp env.template .env
# Edit .env with your values
docker-compose up -d

# Using PM2 (cPanel/WHM)
cd environments/staging
cp env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

### Production Environment

```bash
# Using Docker
cd environments/production
cp env.template .env
# Edit .env with your values
docker-compose up -d

# Using PM2 (cPanel/WHM)
cd environments/production
cp env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

### Production2 Environment

```bash
# Using Docker
cd environments/production2
# Note: Production2 may use production .env template
cp ../production/env.template .env
# Edit .env with your values
docker-compose up -d

# Using PM2 (cPanel/WHM)
cd environments/production2
cp ../production/env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

## 🔧 Environment Configuration

### Development
- **URL**: http://localhost:3000
- **Database**: PostgreSQL on port 5432
- **Redis**: Redis on port 6379
- **Features**: Hot reload, debug logging, admin tools
- **Rate Limits**: Lenient for development

### Staging
- **URL**: https://staging-api.yourdomain.com
- **Database**: PostgreSQL on port 5433 (Docker) / 5432 (PM2)
- **Redis**: Redis on port 6380 (Docker) / 6379 (PM2)
- **Features**: Production-like setup, staging APIs
- **Rate Limits**: Moderate for testing

### Production
- **URL**: https://api.yourdomain.com
- **Database**: PostgreSQL (optimized for high volume)
- **Redis**: Redis cluster (3 nodes)
- **Features**: High availability, monitoring, SSL
- **Rate Limits**: High volume (450k+ jobs/day)

### Production2
- **URL**: https://api2.yourdomain.com (if configured)
- **Database**: PostgreSQL (separate instance)
- **Redis**: Redis (can share or use separate instance)
- **Features**: Secondary production environment, monitoring
- **Rate Limits**: High volume (450k+ jobs/day)

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- Environment variables configured

### Commands

```bash
# Start environment
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop environment
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Scale workers
docker-compose up -d --scale workers=5
```

## ⚡ PM2 Deployment (cPanel/WHM)

### Prerequisites
- Node.js 18+ installed
- PM2 installed globally
- Environment variables configured

### Commands

```bash
# Start environment
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Stop environment
pm2 stop all
pm2 delete all

# Restart specific process
pm2 restart sf-middleware-prod
```

## 🌐 Nginx Configuration

### SSL Setup

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d staging-api.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

### Configuration Files

- **Development**: `environments/development/nginx.conf`
- **Staging**: `environments/staging/nginx.conf`
- **Production**: `environments/production/nginx.conf`

## 📊 Monitoring

### Health Checks

```bash
# Check application health
curl https://api.yourdomain.com/health

# Check queue health
curl https://api.yourdomain.com/queue/monitor/health

# Check detailed metrics
curl https://api.yourdomain.com/queue/monitor/detailed
```

### Prometheus (Production)

```bash
# Access Prometheus
open http://yourdomain.com:9090

# Check metrics
curl http://yourdomain.com:9090/api/v1/query?query=up
```

## 🔄 Deployment Scripts

### Automated Deployment

```bash
# Deploy to development
./scripts/deploy.sh development docker

# Deploy to staging
./scripts/deploy.sh staging pm2

# Deploy to production
./scripts/deploy.sh production pm2
```

### Environment Management

```bash
# Start environment
./scripts/start-env.sh development docker

# Stop environment
./scripts/stop-env.sh production pm2

# Health check
./scripts/health-check.sh staging
```

## 🗄️ Database Setup

### Create Databases

```bash
# Development
createdb sfapi_dev

# Staging
createdb sfapi_staging

# Production
createdb sfapi_production
```

### Run Migrations

```bash
# Development
NODE_ENV=development npx prisma migrate dev

# Staging
NODE_ENV=staging npx prisma migrate deploy

# Production
NODE_ENV=production npx prisma migrate deploy
```

## 🔐 Security Considerations

### Environment Variables
- Use strong, unique passwords for each environment
- Rotate secrets regularly
- Never commit `.env` files to version control

### SSL/TLS
- Use Let's Encrypt for free SSL certificates
- Enable HSTS headers
- Use strong cipher suites

### Firewall
- Restrict database access to localhost only
- Use strong authentication for Redis
- Monitor access logs

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   systemctl status postgresql
   
   # Test connection
   psql -U username -d database -c "SELECT 1;"
   ```

3. **Redis Connection Issues**
   ```bash
   # Check Redis status
   systemctl status redis
   
   # Test connection
   redis-cli ping
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem -text -noout
   
   # Renew certificates
   sudo certbot renew
   ```

### Logs

```bash
# Docker logs
docker-compose logs app
docker-compose logs postgres
docker-compose logs redis

# PM2 logs
pm2 logs sf-middleware-prod
pm2 logs sf-worker-prod-salesforce

# System logs
journalctl -u postgresql
journalctl -u redis
```

## 📈 Performance Optimization

### Production Optimizations

1. **Database**
   - Enable connection pooling
   - Create appropriate indexes
   - Regular VACUUM and ANALYZE

2. **Redis**
   - Configure memory limits
   - Use appropriate eviction policies
   - Enable persistence

3. **Application**
   - Use cluster mode for PM2
   - Enable gzip compression
   - Optimize rate limiting

4. **Nginx**
   - Enable HTTP/2
   - Configure caching
   - Optimize buffer sizes

## 🔄 Backup Strategy

### Database Backups

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U sfuser_prod -d sfapi_production > /backups/sfapi_production_$DATE.sql
gzip /backups/sfapi_production_$DATE.sql
find /backups -name "sfapi_production_*.sql.gz" -mtime +7 -delete
EOF

chmod +x backup-db.sh

# Add to crontab
echo "0 2 * * * /path/to/backup-db.sh" | crontab -
```

### Application Backups

```bash
# Backup application
tar -czf /backups/sf-middleware-$(date +%Y%m%d).tar.gz /opt/sf-middleware/
```

## 📚 Additional Resources

- [Development Setup](environments/development/README.md)
- [Staging Setup](environments/staging/README.md)
- [Production Setup](environments/production/README.md)
- [cPanel/WHM Setup V2](CPANEL_WHM_SETUP_V2.md) - Complete setup for both sf-middleware and sf-dashboard
- [cPanel/WHM Setup](CPANEL_WHM_SETUP.md) - Legacy setup guide
- [API Documentation](API_DOCUMENTATION.md)

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review environment-specific README files
3. Check application logs
4. Verify environment variables
5. Test health endpoints
