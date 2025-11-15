<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

SF Middleware - A high-performance NestJS middleware service for Salesforce integration, supporting 450k+ jobs/day with multi-environment deployment (development, staging, production, production2).

This middleware provides a robust API layer between external systems and Salesforce, handling authentication, queue management, audit logging, error tracking, and performance monitoring.

## Features

- 🚀 **High Performance**: Handles 450k+ jobs/day with optimized queue processing and batch operations
- 🌍 **Multi-Environment**: Development, staging, production, and production2 environments
- 🔑 **Environment-Specific API Keys**: Separate API keys for each environment per user with SHA-256 hash validation
- 🐳 **Docker Support**: Complete Docker setup for all environments with high-volume configuration
- 🖥️ **cPanel/WHM Support**: Production-ready cPanel/WHM deployment with PM2 process management
- 📊 **Monitoring**: Built-in health checks, Prometheus metrics, and performance monitoring
- 🔐 **Security**: API key authentication, JWT tokens, rate limiting, Helmet security headers, and SSL support
- 📈 **Scalable**: Redis cluster (3 nodes) and PostgreSQL optimization for high volume workloads
- 🔄 **Queue System**: BullMQ-based job processing with multiple workers and queue monitoring
- 📝 **Audit Logging**: Comprehensive audit trails for all API calls and cron job executions
- ⚙️ **Settings Management**: Runtime configuration including maintenance mode
- 🔍 **Error Tracking**: Advanced error logging and management with resolution tracking
- 📋 **Reports**: Report generation and management system
- ⏰ **Cron Jobs**: Scheduled job management for automated processing
- 🎯 **Performance Monitoring**: Real-time performance metrics and alerting

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

- [Multi-Environment Setup](docs/MULTI_ENVIRONMENT_SETUP.md) - Complete guide for all environments
- [API Documentation](docs/API_DOCUMENTATION.md) - Complete API reference with all endpoints
- [Tech Stack](docs/TECH_STACK.md) - Technologies and dependencies
- [cPanel/WHM Setup V2](docs/CPANEL_WHM_SETUP_V2.md) - Complete setup guide for both sf-middleware and sf-dashboard
- [High Volume Setup](docs/HIGH_VOLUME_SETUP.md) - Configuration for high-volume processing
- [Rate Limit Guide](docs/RATE_LIMIT_GUIDE.md) - Rate limiting configuration
- [Environment API Keys](docs/ENVIRONMENT_API_KEYS.md) - Environment-specific API key management

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
