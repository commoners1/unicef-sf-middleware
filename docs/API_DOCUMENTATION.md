# Salesforce Middleware API Documentation

Complete guide to using the Salesforce Middleware API, including authentication, endpoints, and usage examples.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Registration & Login](#registration--login)
4. [API Key Management](#api-key-management)
5. [Salesforce API Endpoints](#salesforce-api-endpoints)
6. [Audit & Logging](#audit--logging)
7. [Queue Management](#queue-management)
8. [Cron Jobs](#cron-jobs)
9. [Health Monitoring](#health-monitoring)
10. [Error Management](#error-management)
11. [Reports Management](#reports-management)
12. [Settings Management](#settings-management)
13. [Error Handling](#error-handling)
14. [Rate Limiting](#rate-limiting)
15. [Architecture & Deployment](#architecture--deployment)

---

## Getting Started

### Base URLs by Environment

| Environment | Base URL |
|-------------|----------|
| **Development** | `http://localhost:3000` |
| **Staging** | `https://staging-api.thesubdomain.mydomain.com` |
| **Production** | `https://api.thesubdomain.mydomain.com` |

### Response Format

All API responses are in JSON format and include standard HTTP status codes.

---

## Authentication

The API supports two authentication methods:

1. **JWT Bearer Token** - For user management and API key generation
2. **API Key** - For Salesforce API endpoints (requires `x-api-key` header)

---

## Registration & Login

### 1. Register New User

Create a new user account to start using the API.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePassword123!",
  "company": "Example Corp" // Optional
}
```

**Response:**
```json
{
  "id": "clxxx",
  "email": "user@example.com",
  "name": "John Doe",
  "company": "Example Corp",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePassword123!",
    "company": "Example Corp"
  }'
```

### 2. Login

Authenticate and receive a JWT token for accessing protected endpoints.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

---

## API Key Management

All Salesforce API endpoints require an API key. Generate one using your JWT token.

### Environment-Specific API Keys

API keys are now environment-specific. Each user can have separate keys for:
- **Development** - For local development and testing
- **Staging** - For testing and integration  
- **Production** - For live production use

### Generate API Key

**Endpoint:** `POST /api-key/generate`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "name": "Production Key",
  "description": "Main API key for production use",
  "permissions": ["read", "write"], // Default: ["read"]
  "environment": "production" // "development" | "staging" | "production"
}
```

**Response:**
```json
{
  "key": "sk_abc123def456...",
  "name": "Production Key",
  "description": "Main API key for production use",
  "permissions": ["read", "write"],
  "environment": "production",
  "userId": "clxxx",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**⚠️ Important:** Save your API key immediately. It will only be shown once!

**Example cURL:**
```bash
# Generate development key
curl -X POST http://localhost:3000/api-key/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Development Key",
    "description": "For local development",
    "environment": "development"
  }'

# Generate staging key
curl -X POST https://staging-api.thesubdomain.mydomain.com/api-key/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Staging Key",
    "description": "For testing",
    "environment": "staging"
  }'

# Generate production key
curl -X POST https://api.thesubdomain.mydomain.com/api-key/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Production Key",
    "description": "For live production",
    "environment": "production"
  }'
```

### List API Keys

**Endpoint:** `GET /api-key/keys`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
[
  {
    "id": "key1",
    "key": "sk_abc123...",
    "name": "Development Key",
    "environment": "development",
    "permissions": ["read"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "key2", 
    "key": "sk_def456...",
    "name": "Production Key",
    "environment": "production",
    "permissions": ["read", "write"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Example cURL:**
```bash
curl -X GET http://localhost:3000/api-key/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Keys by Environment

**Endpoint:** `GET /api-key/keys/:environment`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example cURL:**
```bash
# Get staging keys only
curl -X GET http://localhost:3000/api-key/keys/staging \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Revoke API Key

**Endpoint:** `POST /api-key/revoke`

**Request Body:**
```json
{
  "key": "sk_abc123def456..."
}
```

### Delete API Key

**Endpoint:** `POST /api-key/delete`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "key": "sk_abc123def456..."
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api-key/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "key": "sk_abc123def456..."
  }'
```

### Activate API Key

**Endpoint:** `POST /api-key/activate`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "key": "sk_abc123def456..."
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api-key/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "key": "sk_abc123def456..."
  }'
```

---

## Salesforce API Endpoints

All Salesforce endpoints require the `x-api-key` header for authentication.

### Authentication Header

```
x-api-key: sk_abc123def456...
```

### Environment Detection

The API automatically detects the environment based on the API key used:
- **Development keys** → Use development Salesforce endpoints
- **Staging keys** → Use staging Salesforce endpoints  
- **Production keys** → Use production Salesforce endpoints

### Base URLs by Environment

- **Development:** `http://localhost:3000`
- **Staging:** `https://staging-api.thesubdomain.mydomain.com`
- **Production:** `https://api.thesubdomain.mydomain.com`

### 1. Get/Refresh Token

Obtain an access token for Salesforce API calls.

**Endpoint:** `GET /v1/salesforce/token` or `POST /v1/salesforce/token`

**Headers:**
```
x-api-key: sk_abc123def456...
```

**Optional Headers:**
```
x-request-type: manual (optional, for tracking)
```

**Response:**
```json
{
  "tokenResponse": {
    "access_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "openid profile email"
  },
  "requestTimestamp": "2024-01-01T00:00:00.000Z",
  "success": true
}
```

**Example cURL:**
```bash
curl -X GET http://localhost:3000/v1/salesforce/token \
  -H "x-api-key: sk_abc123def456..."
```

### 2. Pledge API

Create or process pledge donations.

**Endpoint:** `POST /v1/salesforce/pledge`

**Headers:**
```
x-api-key: sk_abc123def456...
Content-Type: application/json
```

**Request Body:**
```json
{
  "payload": {
    "amount": 100.00,
    "currency": "IDR",
    "donor_name": "John Doe",
    "email": "donor@example.com"
  },
  "token": "eyJhbGc..."
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/v1/salesforce/pledge \
  -H "x-api-key: sk_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "amount": 100.00,
      "currency": "IDR",
      "donor_name": "John Doe"
    },
    "token": "eyJhbGc..."
  }'
```

### 3. Pledge Charge API

Charge a pledged donation.

**Endpoint:** `POST /v1/salesforce/pledge-charge`

**Headers:**
```
x-api-key: sk_abc123def456...
Content-Type: application/json
```

**Request Body:**
```json
{
  "payload": {
    "pledge_id": "plg_xxx",
    "payment_method_id": "pm_xxx",
    "amount": 100.00
  },
  "token": "eyJhbGc..."
}
```

### 4. One Off API

Process one-time donations.

**Endpoint:** `POST /v1/salesforce/oneoff`

**Headers:**
```
x-api-key: sk_abc123def456...
Content-Type: application/json
```

**Request Body:**
```json
{
  "payload": {
    "amount": 50.00,
    "currency": "IDR",
    "donor_name": "Jane Smith",
    "email": "jane@example.com",
    "description": "One-time donation"
  },
  "token": "eyJhbGc..."
}
```

### 5. Payment Link API

Generate a payment link via Xendit.

**Endpoint:** `POST /v1/salesforce/payment-link`

**Headers:**
```
x-api-key: sk_abc123def456...
Content-Type: application/json
```

**Request Body:**
```json
{
  "payload": {
    "amount": 250000,
    "currency": "IDR",
    "description": "Donation link for campaign",
    "expiry_date": "2024-12-31T23:59:59Z"
  },
  "token": "eyJhbGc..."
}
```

### 6. Get Pledge Cron Jobs

Retrieve undelivered pledge cron job data (individual processed items from cron job runs). Automatically marks jobs as delivered after retrieval.

**Endpoint:** `GET /v1/salesforce/pledge-cron-jobs`

**Headers:**
```
x-api-key: sk_abc123def456...
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "audit_xxx",
      "action": "CRON_JOB",
      "type": "pledge",
      "method": "queue-processor",
      "endpoint": "/api/pledge",
      "requestData": {
        "amount": 100.00,
        "currency": "IDR"
      },
      "responseData": {
        "id": "plg_123",
        "status": "success"
      },
      "statusCode": 200,
      "duration": 250,
      "isDelivered": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Note:** This endpoint returns individual items processed by cron jobs, not the job scheduling records. Each item represents a single API call made during the cron job execution.

**Example cURL:**
```bash
curl -X GET http://localhost:3000/v1/salesforce/pledge-cron-jobs \
  -H "x-api-key: sk_abc123def456..."
```

### 7. Get One-Off Cron Jobs

Retrieve undelivered one-off cron job data (individual processed items from cron job runs).

**Endpoint:** `GET /v1/salesforce/oneoff-cron-jobs`

**Headers:**
```
x-api-key: sk_abc123def456...
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "audit_yyy",
      "action": "CRON_JOB",
      "type": "oneoff",
      "method": "queue-processor",
      "endpoint": "/api/oneoff",
      "requestData": {
        "amount": 50.00,
        "currency": "IDR"
      },
      "responseData": {
        "id": "oo_456",
        "status": "success"
      },
      "statusCode": 200,
      "duration": 180,
      "isDelivered": false,
      "createdAt": "2024-01-01T01:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Note:** Automatically marks retrieved jobs as `isDelivered: true` after returning them.

---

## Audit & Logging

Access your API usage logs and statistics.

### Get Audit Logs

**Endpoint:** `GET /audit/logs`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page

**Example:**
```bash
curl -X GET "http://localhost:3000/audit/logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Statistics

**Endpoint:** `GET /audit/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "today": 150,
  "week": 1200,
  "total": 15000
}
```

### Get Undelivered Cron Jobs

Retrieve all undelivered cron job data (individual processed items from cron job runs).

**Endpoint:** `GET /audit/cron-jobs`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `jobType` (optional) - Filter by job type (e.g., "pledge", "oneoff")

**Response:**
```json
[
  {
    "id": "audit_xxx",
    "action": "CRON_JOB",
    "type": "pledge",
    "method": "queue-processor",
    "endpoint": "/api/pledge",
    "requestData": {...},
    "responseData": {...},
    "statusCode": 200,
    "duration": 250,
    "isDelivered": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Note:** This endpoint returns individual items processed by cron jobs with `action: 'CRON_JOB'` and `isDelivered: false`.

### Mark Jobs as Delivered

**Endpoint:** `POST /audit/mark-delivered`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "jobIds": ["audit_xxx", "audit_yyy"]
}
```

### Get Dashboard Logs (Admin)

**Endpoint:** `GET /audit/dashboard/logs`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `userId` (optional) - Filter by user ID
- `apiKeyId` (optional) - Filter by API key ID
- `action` (optional) - Filter by action type
- `method` (optional) - Filter by HTTP method
- `statusCode` (optional) - Filter by HTTP status code
- `startDate` (optional) - Start date filter
- `endDate` (optional) - End date filter
- `search` (optional) - Search term
- `isDelivered` (optional) - Filter by delivery status

**Example:**
```bash
curl -X GET "http://localhost:3000/audit/dashboard/logs?page=1&limit=20&userId=user123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Dashboard Statistics (Admin)

**Endpoint:** `GET /audit/dashboard/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X GET http://localhost:3000/audit/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Export Audit Logs

**Endpoint:** `POST /audit/export`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "format": "csv",  // "csv" | "json" | "xlsx"
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "userId": "user123",
    "action": "API_CALL"
  }
}
```

**Response:** Returns file download or data based on format.

### Analytics Endpoints

**Get Usage Statistics:**
```bash
GET /audit/analytics/usage-stats
```

**Get Hourly Usage:**
```bash
GET /audit/analytics/hourly-usage
```

**Get Top Endpoints:**
```bash
GET /audit/analytics/top-endpoints
```

**Get User Activity:**
```bash
GET /audit/analytics/user-activity
```

---

## Queue Management

### Get Queue Statistics

**Endpoint:** `GET /queue/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "salesforce": {
    "waiting": 10,
    "active": 5,
    "completed": 1500,
    "failed": 2,
    "delayed": 0,
    "paused": false
  },
  "email": {
    "waiting": 5,
    "active": 2,
    "completed": 800,
    "failed": 1,
    "delayed": 0,
    "paused": false
  },
  "notifications": {
    "waiting": 3,
    "active": 1,
    "completed": 400,
    "failed": 0,
    "delayed": 0,
    "paused": false
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/queue/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Job Counts

**Endpoint:** `GET /queue/counts`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get Queue Performance Metrics

**Endpoint:** `GET /queue/performance`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get All Jobs

**Endpoint:** `GET /queue/jobs`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10, max: 100) - Items per page
- `queue` (optional) - Filter by queue name (salesforce, email, notifications)
- `status` (optional) - Filter by status (waiting, active, completed, failed)

**Example:**
```bash
curl -X GET "http://localhost:3000/queue/jobs?page=1&limit=20&queue=salesforce&status=failed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Job by ID

**Endpoint:** `GET /queue/jobs/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X GET http://localhost:3000/queue/jobs/job123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Retry Failed Job

**Endpoint:** `POST /queue/jobs/:id/retry`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X POST http://localhost:3000/queue/jobs/job123/retry \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Remove Job

**Endpoint:** `DELETE /queue/jobs/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/queue/jobs/job123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Pause Queue

**Endpoint:** `POST /queue/queues/:queueName/pause`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X POST http://localhost:3000/queue/queues/salesforce/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Resume Queue

**Endpoint:** `POST /queue/queues/:queueName/resume`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X POST http://localhost:3000/queue/queues/salesforce/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Clear Queue

**Endpoint:** `POST /queue/queues/:queueName/clear`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

⚠️ **Warning:** This permanently deletes all jobs in the queue!

**Example:**
```bash
curl -X POST http://localhost:3000/queue/queues/salesforce/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Queue Monitor Endpoints

**Get Queue Health:**
```bash
GET /queue/monitor/health
```

**Get Detailed Stats:**
```bash
GET /queue/monitor/detailed
```

**Get Metrics:**
```bash
GET /queue/monitor/metrics
```

**Get Alerts:**
```bash
GET /queue/monitor/alerts
```

**Force Flush Batch:**
```bash
POST /queue/monitor/force-flush
```

---

## Cron Jobs

### Get All Cron Jobs

**Endpoint:** `GET /cron-jobs`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `status` (optional) - Filter by status (active, paused, failed)
- `type` (optional) - Filter by job type (pledge, oneoff, etc.)

**Example:**
```bash
curl -X GET "http://localhost:3000/cron-jobs?page=1&limit=20&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Cron Job Statistics

**Endpoint:** `GET /cron-jobs/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get Cron Job History

**Endpoint:** `GET /cron-jobs/history`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `jobId` (optional) - Filter by specific job ID

### Run Cron Job Manually

**Endpoint:** `POST /cron-jobs/:id/run`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X POST http://localhost:3000/cron-jobs/job123/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Toggle Cron Job

**Endpoint:** `PUT /cron-jobs/:id/toggle`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "enabled": true
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/cron-jobs/job123/toggle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Get Cron Schedules

**Endpoint:** `GET /cron-jobs/schedules`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

---

## Health Monitoring

### Check Health

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345.67,
  "message": "Salesforce Middleware is running"
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/health
```

---

## User Management

### Get User Profile

**Endpoint:** `GET /user/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update User Profile

**Endpoint:** `PUT /user/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Updated",
  "company": "New Corp"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated"}'
```

### Get All Users (Admin Only)

**Endpoint:** `GET /user/all`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page

**Example:**
```bash
curl -X GET "http://localhost:3000/user/all?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get User by ID

**Endpoint:** `GET /user/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X GET http://localhost:3000/user/user123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update User Role (Admin Only)

**Endpoint:** `POST /user/:id/role`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "ADMIN"  // "USER" | "ADMIN" | "SUPER_ADMIN"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/user/user123/role \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

### Get Available Roles

**Endpoint:** `GET /user/roles/available`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "roles": ["USER", "ADMIN", "SUPER_ADMIN"],
  "descriptions": {
    "USER": "Standard user with basic access",
    "ADMIN": "Administrator with user management capabilities",
    "SUPER_ADMIN": "Super administrator with full system access"
  }
}
```

---

## Error Management

### Get All Errors

**Endpoint:** `GET /errors`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `severity` (optional) - Filter by severity
- `source` (optional) - Filter by source
- `type` (optional) - Filter by error type
- `environment` (optional) - Filter by environment
- `resolved` (optional) - Filter by resolved status

**Example:**
```bash
curl -X GET "http://localhost:3000/errors?page=1&limit=20&resolved=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Error Statistics

**Endpoint:** `GET /errors/stats`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get Error Trends

**Endpoint:** `GET /errors/trends`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get Error Sources

**Endpoint:** `GET /errors/sources`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get Error Types

**Endpoint:** `GET /errors/types`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Get Error by ID

**Endpoint:** `GET /errors/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X GET http://localhost:3000/errors/error123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Resolve Error

**Endpoint:** `PATCH /errors/:id/resolve`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "resolvedBy": "admin@example.com"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/errors/error123/resolve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolvedBy": "admin@example.com"}'
```

### Unresolve Error

**Endpoint:** `PATCH /errors/:id/unresolve`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Delete Error

**Endpoint:** `DELETE /errors/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

### Bulk Delete Errors

**Endpoint:** `POST /errors/bulk-delete`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ids": ["error1", "error2", "error3"]
}
```

### Export Errors

**Endpoint:** `POST /errors/export`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "severity": "high"
  },
  "format": "csv"  // "csv" | "json" | "xlsx"
}
```

---

## Reports Management

### Get All Reports

**Endpoint:** `GET /reports`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X GET http://localhost:3000/reports \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generate Report

**Endpoint:** `POST /reports/:id/generate`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```bash
curl -X POST http://localhost:3000/reports/report123/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download Report

**Endpoint:** `GET /reports/:id/download`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:** Returns file download.

**Example:**
```bash
curl -X GET http://localhost:3000/reports/report123/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output report.pdf
```

---

## Settings Management

### Get Settings

**Endpoint:** `GET /settings`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "general": {
    "maintenanceMode": false,
    "maxRequestsPerMinute": 1000
  },
  "notifications": {
    "emailAlerts": true,
    "webhookUrl": "https://example.com/webhook"
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Settings

**Endpoint:** `PUT /settings`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "general": {
    "maintenanceMode": false
  },
  "notifications": {
    "emailAlerts": true
  }
}
```

**Maintenance Mode:**
When `maintenanceMode` is enabled:
- All endpoints are blocked except:
  - `/auth/login` - Users can still login
  - `/settings` - Admins can update settings
  - `/health` and `/healthz` - Health checks remain available
- Admin and SUPER_ADMIN users can bypass maintenance mode
- Other users receive a 503 Service Unavailable response

**Example:**
```bash
curl -X PUT http://localhost:3000/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"general": {"maintenanceMode": false}}'
```

---

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Example Error Responses

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "API key required",
  "error": "Unauthorized"
}
```

**409 Conflict (User exists):**
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

---

## Rate Limiting

The API implements tiered rate limiting to handle high-volume traffic (450k+ requests/day) while protecting the system. See `RATE_LIMIT_GUIDE.md` for details.

### Rate Limit Strategy

The system uses two rate limiters:

1. **High-Volume Rate Limiter** (for `/v1/salesforce` endpoints):
   - Window: 1 minute
   - Default: 1000 requests/minute per IP (configurable via `HIGH_VOLUME_RATE_LIMIT`)
   - Applied to: Salesforce API endpoints

2. **General API Rate Limiter** (for admin/UI endpoints):
   - Window: 15 minutes
   - Default: 500 requests/15min per IP (configurable via `RATE_LIMIT_MAX`)
   - Applied to: All other endpoints except health checks and queue endpoints

### Excluded Endpoints

The following endpoints are **NOT rate limited**:
- `/health` and `/healthz` - Health check endpoints
- `/queue/*` - Queue management endpoints
- `/jobs/*` - Job management endpoints
- `/v1/salesforce/*` - Handled by high-volume rate limiter
- `/settings` - Admin endpoints (when authenticated as admin)

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1704067200
```

### Environment Variables

- `HIGH_VOLUME_RATE_LIMIT` - High-volume rate limit (default: 1000/minute)
- `RATE_LIMIT_MAX` - General API rate limit (default: 500/15min)

---

## Response Data Format

### Array Response

When the API returns an array:

```json
{
  "data": [...],
  "error": false,
  "http_code": 200
}
```

### Object Response

When the API returns an object:

```json
{
  "id": "123",
  "name": "Example",
  "error": false,
  "http_code": 200
}
```

### Error Response

```json
{
  "error": true,
  "message": "Error description",
  "http_code": 400
}
```

---

## Quick Start Guide

### 1. Register and Login

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePassword123!"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### 2. Generate API Keys for Each Environment

```bash
# Development key
curl -X POST http://localhost:3000/api-key/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Development Key",
    "description": "For local development",
    "environment": "development"
  }'

# Staging key
curl -X POST https://staging-api.thesubdomain.mydomain.com/api-key/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Staging Key",
    "description": "For testing",
    "environment": "staging"
  }'

# Production key
curl -X POST https://api.thesubdomain.mydomain.com/api-key/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Production Key",
    "description": "For live production",
    "environment": "production"
  }'
```

### 3. Use Salesforce API with Environment-Specific Keys

```bash
# Development environment
curl -X GET http://localhost:3000/v1/salesforce/token \
  -H "x-api-key: YOUR_DEV_API_KEY"

curl -X POST http://localhost:3000/v1/salesforce/pledge \
  -H "x-api-key: YOUR_DEV_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {...},
    "token": "YOUR_TOKEN"
  }'

# Staging environment
curl -X GET https://staging-api.thesubdomain.mydomain.com/v1/salesforce/token \
  -H "x-api-key: YOUR_STAGING_API_KEY"

curl -X POST https://staging-api.thesubdomain.mydomain.com/v1/salesforce/pledge \
  -H "x-api-key: YOUR_STAGING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {...},
    "token": "YOUR_TOKEN"
  }'

# Production environment
curl -X GET https://api.thesubdomain.mydomain.com/v1/salesforce/token \
  -H "x-api-key: YOUR_PROD_API_KEY"

curl -X POST https://api.thesubdomain.mydomain.com/v1/salesforce/pledge \
  -H "x-api-key: YOUR_PROD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {...},
    "token": "YOUR_TOKEN"
  }'
```

---

## Support

For issues or questions:
- Check the error response for details
- Review audit logs for debugging
- Contact support with your API key and request details

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Rotate API keys** periodically
4. **Use HTTPS** in production
5. **Monitor audit logs** for suspicious activity
6. **Revoke unused API keys** immediately

---

**Last Updated:** November 8, 2025

---

## Architecture & Deployment

This API can be deployed in multiple environments:

### Development
- **Local Setup:** Run NestJS directly with `npm run start:dev`
- **Docker:** Use `environments/development/docker-compose.yml`
- **PM2:** Use `environments/development/ecosystem.config.js`

### Staging
- **Base URL:** `https://staging-api.thesubdomain.mydomain.com`
- **Purpose:** Testing and integration before production
- **Setup:** Follow [Multi-Environment Setup Guide](MULTI_ENVIRONMENT_SETUP.md)

### Production
- **Base URL:** `https://api.thesubdomain.mydomain.com`
- **Dashboard:** `https://thesubdomain.mydomain.com`
- **Purpose:** Live production environment
- **Setup:** Follow [cPanel/WHM Setup Guide V2](CPANEL_WHM_SETUP_V2.md)

### Key Features
- ✅ **REST API** + **Background Workers** in unified NestJS application
- ✅ **BullMQ** processors for job queue management
- ✅ **Environment-specific API keys** (dev/staging/prod)
- ✅ **High-volume processing** (450k+ jobs/day)
- ✅ **Monitoring** via health endpoints and audit logs
- ✅ **Admin Dashboard** for user and queue management

For detailed deployment instructions, see:
- [cPanel/WHM Setup V2](CPANEL_WHM_SETUP_V2.md) - Complete production setup guide
- [Multi-Environment Setup](MULTI_ENVIRONMENT_SETUP.md) - Multi-environment deployment
- [API Documentation](API_DOCUMENTATION.md) - This file
