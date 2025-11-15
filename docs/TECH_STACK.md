# Tech Stack Documentation

Complete overview of technologies used in Salesforce Middleware project.

## Core Stack

**Framework**: NestJS v11.0.1
**Language**: TypeScript v5.9.3
**Database**: PostgreSQL v15 (production) / v16 (development)
**ORM**: Prisma v6.18.0 (client) / v6.19.0 (CLI)
**Queue**: BullMQ v5.61.0
**Cache**: Redis v7
**Runtime**: Node.js 18+ (EA-NodeJS22 for cPanel/WHM)

## Dependencies

### Core
- @nestjs/common: ^11.0.1
- @nestjs/core: ^11.0.1
- @nestjs/bullmq: ^11.0.4
- @nestjs/jwt: ^11.0.1
- @nestjs/config: ^4.0.2

### Database
- @prisma/client: ^6.18.0
- prisma: ^6.19.0

### Queue & Cache
- bullmq: ^5.61.0
- ioredis: ^5.8.2

### HTTP Client
- axios: ^1.12.2
- @nestjs/axios: ^4.0.1

### Security
- helmet: ^8.1.0
- express-rate-limit: ^8.1.0
- bcrypt: ^6.0.0
- passport: ^0.7.0
- passport-jwt: ^4.0.1

### Monitoring
- @opentelemetry/api: ^1.9.0
- @opentelemetry/sdk-node: ^0.207.0
- prom-client: ^15.1.3
- @nestjs/terminus: ^11.0.0

### Validation
- zod: ^4.1.12

### Logging
- pino: ^10.1.0
- pino-pretty: ^13.1.2

### Resilience
- cockatiel: ^3.2.1

### Scheduling
- @nestjs/schedule: ^6.0.1

### Testing
- jest: ^30.2.0
- @nestjs/testing: ^11.1.7
- supertest: ^7.1.4
- vitest: ^3.2.4

## Development Tools
- eslint: ^9.38.0
- prettier: ^3.6.2
- husky: ^9.1.7
- typescript: ^5.9.3

## Docker Services
- PostgreSQL 16
- Redis 7
- Adminer (DB admin)
- Jaeger (tracing)

## Architecture Pattern
- Modular Architecture
- Dependency Injection
- Repository Pattern
- Queue Pattern
- Guard Pattern

## Additional Libraries

### Utilities
- class-transformer: ^0.5.1
- class-validator: ^0.14.2
- reflect-metadata: ^0.2.2
- rxjs: ^7.8.1

### Resilience & Circuit Breaking
- cockatiel: ^3.2.1

### JWT & Authentication
- jwt-decode: ^4.0.0
- passport: ^0.7.0
- passport-jwt: ^4.0.1
- bcrypt: ^6.0.0

## Deployment & Process Management

### Production
- **PM2**: Process manager for Node.js applications
- **Docker**: Containerization for all environments
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and load balancer
- **cPanel/WHM**: Hosting platform support

### Monitoring & Observability
- **Prometheus**: Metrics collection
- **OpenTelemetry**: Distributed tracing
- **Jaeger**: Tracing backend (development)

## Database Schema

### Core Models
- **User**: User accounts with roles (USER, ADMIN, SUPER_ADMIN)
- **ApiKey**: Environment-specific API keys with SHA-256 hash validation
- **AuditLog**: Comprehensive audit trail for all API calls
- **JobAudit**: Job queue tracking and status
- **Report**: Report generation and management
- **SystemSetting**: Runtime configuration settings
- **ErrorLog**: Error tracking and resolution management

### Key Features
- Environment-specific API keys (development, staging, production)
- Comprehensive audit logging with delivery tracking
- Job queue management with BullMQ
- Error tracking with resolution workflow
- System settings with maintenance mode support

Last Updated: November 8, 2025