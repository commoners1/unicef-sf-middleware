# Multi-Environment Setup Summary

## 🎯 Overview

This project now supports **simultaneous multi-environment deployment** with clean separation between development, staging, and production environments. Both Docker and cPanel/WHM deployment methods are fully supported.

## 📁 Directory Structure

```
sf-middleware/
├── environments/                    # Multi-environment configurations
│   ├── development/                # Local development
│   │   ├── docker-compose.yml     # Docker setup
│   │   ├── Dockerfile             # Development container
│   │   ├── ecosystem.config.js    # PM2 configuration
│   │   ├── nginx.conf             # Nginx config
│   │   ├── env.template           # Environment variables template
│   │   └── README.md              # Development docs
│   ├── staging/                   # Testing environment
│   │   ├── docker-compose.yml     # Docker setup
│   │   ├── Dockerfile             # Staging container
│   │   ├── ecosystem.config.js    # PM2 configuration
│   │   ├── nginx.conf             # Nginx config
│   │   ├── env.template           # Environment variables template
│   │   └── README.md              # Staging docs
│   ├── production/                # Live production
│   │   ├── docker-compose.yml     # High-volume Docker setup
│   │   ├── Dockerfile             # Production container
│   │   ├── ecosystem.config.js    # PM2 configuration
│   │   ├── nginx.conf             # Nginx config
│   │   ├── prometheus.yml         # Monitoring config
│   │   ├── env.template           # Environment variables template
│   │   └── README.md              # Production docs
│   └── shared/                    # Shared configurations
│       └── config/
│           └── configuration.ts   # Centralized config
├── scripts/                       # Deployment scripts
│   ├── deploy.sh                  # Main deployment script
│   ├── start-env.sh              # Start environment
│   ├── stop-env.sh               # Stop environment
│   └── health-check.sh           # Health monitoring
└── docs/                         # Documentation
    ├── MULTI_ENVIRONMENT_SETUP.md
    ├── CPANEL_WHM_SETUP.md
    └── ENVIRONMENT_SUMMARY.md
```

## 🚀 Quick Start Commands

### Development
```bash
# Docker
cd environments/development
cp env.template .env
# Edit .env with your values
docker-compose up -d

# PM2
cd environments/development
cp env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

### Staging
```bash
# Docker
cd environments/staging
cp env.template .env
# Edit .env with your values
docker-compose up -d

# PM2 (cPanel/WHM)
cd environments/staging
cp env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

### Production
```bash
# Docker
cd environments/production
cp env.template .env
# Edit .env with your values
docker-compose up -d

# PM2 (cPanel/WHM)
cd environments/production
cp env.template .env
# Edit .env with your values
npm install && npm run build
pm2 start ecosystem.config.js
```

## 🌐 Environment URLs

| Environment | URL | Port | Database | Redis |
|-------------|-----|------|----------|-------|
| Development | http://localhost:3000 | 3000 | 5432 | 6379 |
| Staging | https://staging-api.yourdomain.com | 3001 (Docker) / 3000 (PM2) | 5433 (Docker) / 5432 (PM2) | 6380 (Docker) / 6379 (PM2) |
| Production | https://api.yourdomain.com | 3000 | 5432 | 6379 |

## 🔧 Environment Features

### Development
- ✅ Hot reload for development
- ✅ Debug logging
- ✅ Admin tools (Adminer, Redis Commander)
- ✅ Lenient rate limiting
- ✅ Sandbox Salesforce APIs

### Staging
- ✅ Production-like setup
- ✅ Staging Salesforce APIs
- ✅ Moderate rate limiting
- ✅ Health monitoring
- ✅ SSL support

### Production
- ✅ High availability (2 app replicas)
- ✅ High volume processing (5+ workers)
- ✅ Production Salesforce APIs
- ✅ High rate limiting (450k+ jobs/day)
- ✅ Redis cluster (3 nodes)
- ✅ Prometheus monitoring
- ✅ SSL with security headers

## 📊 Performance Expectations

### Development
- **Capacity**: 1,000+ jobs/day
- **Response Time**: <1 second
- **Uptime**: 95%

### Staging
- **Capacity**: 10,000+ jobs/day
- **Response Time**: <2 seconds
- **Uptime**: 99%

### Production
- **Capacity**: 450,000+ jobs/day
- **Response Time**: <2 seconds
- **Uptime**: 99.9%
- **Error Rate**: <1%

## 🛠️ Management Scripts

### Deployment
```bash
# Deploy to any environment
./scripts/deploy.sh [environment] [method]

# Examples
./scripts/deploy.sh development docker
./scripts/deploy.sh staging pm2
./scripts/deploy.sh production pm2
```

### Environment Control
```bash
# Start environment
./scripts/start-env.sh [environment] [method]

# Stop environment
./scripts/stop-env.sh [environment] [method]

# Health check
./scripts/health-check.sh [environment]
```

### NPM Scripts
```bash
# Quick deployment
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod

# Environment control
npm run start:dev:env
npm run start:staging:env
npm run start:prod:env

# Health checks
npm run health:dev
npm run health:staging
npm run health:prod
```

## 🔐 Security Features

- ✅ API key authentication
- ✅ Rate limiting per environment
- ✅ SSL/TLS encryption
- ✅ Security headers
- ✅ Environment isolation
- ✅ Database access restrictions
- ✅ Redis authentication

## 📈 Monitoring

### Health Endpoints
- `/health` - Application health
- `/queue/monitor/health` - Queue health
- `/queue/monitor/detailed` - Detailed metrics

### Prometheus (Production)
- Application metrics
- Queue metrics
- Database metrics
- Redis metrics

## 🗄️ Database Strategy

### Development
- Single PostgreSQL instance
- Development data
- Easy reset and migration

### Staging
- Separate PostgreSQL instance
- Test data
- Production-like schema

### Production
- Optimized PostgreSQL
- High availability
- Automated backups
- Performance monitoring

## 🔄 Queue Strategy

### Development
- Single Redis instance
- Low concurrency (2 workers)
- Debug logging

### Staging
- Single Redis instance
- Medium concurrency (5 workers)
- Test data processing

### Production
- Redis cluster (3 nodes)
- High concurrency (20+ workers)
- High volume processing
- Monitoring and alerting

## 📚 Documentation

- [Multi-Environment Setup](MULTI_ENVIRONMENT_SETUP.md) - Complete setup guide
- [cPanel/WHM Setup V2](CPANEL_WHM_SETUP_V2.md) - Complete cPanel/WHM setup for both sf-middleware and sf-dashboard
- [cPanel/WHM Setup](CPANEL_WHM_SETUP.md) - cPanel/WHM specific guide (legacy)
- [API Documentation](API_DOCUMENTATION.md) - API reference
- [High Volume Setup](HIGH_VOLUME_SETUP.md) - Production optimization

## ✅ Benefits

1. **Simultaneous Access**: All environments can run at the same time
2. **Clean Separation**: No code duplication, environment-specific configs
3. **Easy Deployment**: One-command deployment to any environment
4. **Flexible Hosting**: Docker and cPanel/WHM support
5. **Production Ready**: High volume, monitoring, security
6. **Developer Friendly**: Hot reload, debug tools, easy setup
7. **Maintainable**: Centralized config, shared codebase
8. **Scalable**: Easy to add new environments or scale existing ones

## 🎉 Ready to Use!

Your SF Middleware now supports **simultaneous multi-environment deployment** just like Xendit, Midtrans, and other professional API services. You can run development, staging, and production environments at the same time with different configurations, databases, and endpoints.

**Next Steps:**
1. Copy environment templates to `.env` files
2. Update configuration values
3. Deploy your first environment
4. Test the setup
5. Deploy to production when ready

**Happy coding! 🚀**
