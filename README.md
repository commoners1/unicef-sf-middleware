# SF Middleware

## Description

SF Middleware - A high-performance NestJS middleware service for Salesforce integration, supporting 450k+ jobs/day with multi-environment deployment (development, staging, production, production2).

This middleware provides a robust API layer between external systems and Salesforce, handling authentication, queue management, audit logging, error tracking, and performance monitoring.

## Features

- **High Performance**: Handles 450k+ jobs/day with optimized queue processing and batch operations
- **Multi-Environment**: Development, staging, production, and production2 environments
- **Environment-Specific API Keys**: Separate API keys for each environment per user with SHA-256 hash validation
- **Docker Support**: Complete Docker setup for all environments with high-volume configuration
- **cPanel/WHM Support**: Production-ready cPanel/WHM deployment with PM2 process management
- **Monitoring**: Built-in health checks, Prometheus metrics, and performance monitoring
- **Security**: API key authentication, JWT tokens, rate limiting, Helmet security headers, and SSL support
- **Scalable**: Redis cluster (3 nodes) and PostgreSQL optimization for high volume workloads
- **Queue System**: BullMQ-based job processing with multiple workers and queue monitoring
- **Audit Logging**: Comprehensive audit trails for all API calls and cron job executions
- **Settings Management**: Runtime configuration including maintenance mode
- **Error Tracking**: Advanced error logging and management with resolution tracking
- **Reports**: Report generation and management system
- **Cron Jobs**: Scheduled job management for automated processing
- **Performance Monitoring**: Real-time performance metrics and alerting

## Quick Start

### Multi-Environment Setup

```bash
# Development Environment
cd environments/development
cp env.template .env
# Edit .env with your values
docker-compose up -d

# Staging Environment
cd environments/staging
cp env.template .env
# Edit .env with your values
docker-compose up -d

# Production Environment
cd environments/production
cp env.template .env
# Edit .env with your values
docker-compose up -d
```

### Traditional Setup

```bash
# Install dependencies
$ npm install

# Development
$ npm run start:dev

# Production
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

### Multi-Environment Deployment

This project supports multiple deployment methods:

#### Docker Deployment
```bash
# Deploy to any environment
./scripts/deploy.sh [environment] docker

# Examples
./scripts/deploy.sh development docker
./scripts/deploy.sh staging docker
./scripts/deploy.sh production docker
```

#### cPanel/WHM Deployment
```bash
# Deploy to cPanel/WHM
./scripts/deploy.sh [environment] pm2

# Examples
./scripts/deploy.sh staging pm2
./scripts/deploy.sh production pm2
```

### Environment URLs

- **Development**: http://localhost:3000
- **Staging**: https://staging-api.yourdomain.com
- **Production**: https://api.yourdomain.com
- **Production2**: https://api2.yourdomain.com (if configured)

### Documentation

#### API & Integration
- [API Documentation](docs/api/API_DOCUMENTATION.md) - Complete API reference with all endpoints
- [Frontend Integration Guide](docs/integration/FRONTEND_INTEGRATION_GUIDE.md) - Integration guide for frontend applications

#### Setup & Configuration
- [Multi-Environment Setup](docs/setup/MULTI_ENVIRONMENT_SETUP.md) - Complete guide for all environments
- [cPanel/WHM Setup V2](docs/setup/CPANEL_WHM_SETUP_V2.md) - Complete setup guide for both sf-middleware and sf-dashboard
- [cPanel User Setup](docs/setup/CPANEL_USER_SETUP.md) - Setup guide for cPanel users without root access
- [Clean VM Setup](docs/setup/CLEAN_VM_SETUP.md) - Setup guide for fresh virtual machines
- [High Volume Setup](docs/setup/HIGH_VOLUME_SETUP.md) - Configuration for high-volume processing
- [Environment API Keys](docs/setup/ENVIRONMENT_API_KEYS.md) - Environment-specific API key management
- [Environment Summary](docs/setup/ENVIRONMENT_SUMMARY.md) - Overview of environment configurations

#### Implementation & Features
- [Caching Implementation](docs/implementation/CACHING_IMPLEMENTATION.md) - Caching strategy and implementation
- [Persistence Implementation](docs/implementation/PERSISTENCE_IMPLEMENTED.md) - Data persistence details
- [Rate Limit Guide](docs/implementation/RATE_LIMIT_GUIDE.md) - Rate limiting configuration
- [Custom Headers](docs/implementation/CUSTOM_HEADERS.md) - Custom HTTP headers configuration
- [Admin Dashboard Specification](docs/features/ADMIN_DASHBOARD_SPECIFICATION.md) - Admin dashboard features
- [Cron Jobs Complete Summary](docs/features/CRON_JOBS_COMPLETE_SUMMARY.md) - Cron jobs overview
- [Cron Jobs Dashboard Integration](docs/features/CRON_JOBS_DASHBOARD_INTEGRATION.md) - Dashboard integration for cron jobs

#### Development & Technical
- [Tech Stack](docs/development/TECH_STACK.md) - Technologies and dependencies
- [Codebase Improvements](docs/development/CODEBASE_IMPROVEMENTS.md) - Recent codebase improvements
- [Security Improvements](docs/development/SECURITY_IMPROVEMENTS.md) - Security enhancements
- [Structure Improvements](docs/development/STRUCTURE_IMPROVEMENTS.md) - Code structure improvements

#### Testing
- [Test Coverage Summary](docs/testing/TEST_COVERAGE_SUMMARY.md) - Test coverage overview
- [Test Persistence](docs/testing/TEST_PERSISTENCE.md) - Testing persistence layer

#### Troubleshooting
- [Warnings Fixed](docs/troubleshooting/WARNINGS_FIXED.md) - Resolved warnings and issues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Freyza Kusuma**

## Support

For issues and questions, please check the documentation or open an issue in the repository.
