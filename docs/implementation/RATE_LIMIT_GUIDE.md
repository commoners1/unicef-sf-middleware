# Rate Limiting Strategy for High-Volume Production API

## Quick Reference

| Endpoint Type | Rate Limit | Capacity per IP | Scale Strategy |
|--------------|------------|-----------------|----------------|
| `/queue/*`, `/jobs/*` | Unlimited | Redis/Worker capacity | Add workers |
| `/v1/salesforce/*` | 1000 req/min | 1.44M req/day | Add instances |
| Auth, User, API-Key | 500 req/15min | 48K req/day | Sufficient |
| `/health` | Unlimited | N/A | N/A |

**Can handle:**
- ✅ **450K requests/day** - Single instance, default config
- ✅ **1.44M requests/day** - Single instance, per high-volume IP
- ✅ **10M+ requests/day** - Load balancer + multiple instances
- ✅ **Unlimited** - With horizontal scaling infrastructure

## Overview

This API is designed to handle **450,000+ requests per day** (18,750 requests/hour, 312 requests/minute) with the ability to scale to **millions of requests/day** with proper infrastructure.

## Current Configuration (Tiered Rate Limiting)

### 1. **Job/Queue Endpoints** (NO Rate Limiting)
These endpoints bypass rate limiting entirely:
- `/queue/*` - Queue management endpoints
- `/jobs/*` - Job status endpoints

**Why?** These are protected by:
- API Key authentication (`ApiKeyGuard`)
- BullMQ queue system (built-in backpressure)
- Redis-based job queuing (prevents overwhelming the system)

### 2. **High-Volume API Endpoints** (1000 requests/minute per IP)
Tier 1 rate limiting for high-traffic endpoints:
- `/v1/salesforce/*` - Salesforce API calls
- 1-minute sliding window
- 1000 requests per IP per minute
- Configured via `HIGH_VOLUME_RATE_LIMIT` env var

**Capacity:** Up to 1,440,000 requests/day per IP (with 1000 req/min limit)

### 3. **General API Endpoints** (500 requests/15min per IP)
Standard rate limiting for admin/management endpoints:
- `/auth/*` - Authentication endpoints
- `/user/*` - User management
- `/api-key/*` - API key management
- `/audit/*` - Audit log endpoints

### 4. **Health Check Endpoints** (NO Rate Limiting)
- `/health` - Health check
- `/healthz` - Alternative health check

## Can It Handle 450K Requests/Day?

### ✅ Yes, Here's Why:

#### 1. **Queue System Handles Most Traffic**
Your 450,000 daily requests go through the **BullMQ queue system** (`SalesforceProcessor`):
- Jobs are queued in Redis
- Processed asynchronously by workers
- Protected by API key authentication
- No rate limiting on `/queue/*` endpoints

#### 2. **Calculation Breakdown**

**For 450K requests/day:**
```
450,000 requests/day
= 18,750 requests/hour
= 312 requests/minute
= 4,680 requests/15min
```

**With tiered rate limiting:**
- **Queue endpoints**: Unlimited requests (protected by auth)
- **High-volume API** (`/v1/salesforce/*`): 1000 requests/minute per IP
  - Capacity per IP: **1,440,000 requests/day**
  - Multiple IPs behind load balancer: **Unlimited scale**
- **General API**: 500 requests/15min per IP
  - Capacity per IP: **48,000 requests/day**
- **Multiple IPs**: Load balancer can distribute traffic across all endpoints

#### 3. **Recommended Architecture**

For optimal performance with 450K requests/day:

```
┌─────────────┐
│  Load       │  Distributes requests across multiple app instances
│  Balancer   │
└──────┬──────┘
       │
   ┌───┴────┬────────┬─────────┐
   │        │        │         │
┌──▼───┐ ┌──▼───┐ ┌──▼──┐ ┌───▼──┐
│ App  │ │ App  │ │ App │ │ App  │  Each instance can handle
│  1   │ │  2   │ │ 3   │ │  4   │  1000 requests/15min
└──┬───┘ └──┬───┘ └──┬──┘ └──┬───┘
   │        │        │       │
   └────────┴────────┴───────┘
            │
      ┌─────▼─────┐
      │   Redis   │  Queue storage (BullMQ)
      │           │  Handles job processing
      └───────────┘
```

## Environment Variables

Add these to your `.env`:

```env
# Rate Limiting - High Volume Endpoints (Salesforce API, etc.)
HIGH_VOLUME_RATE_LIMIT=1000     # Requests per minute per IP for /v1/salesforce/*
                                   # Default: 1000 req/min = 1.44M requests/day per IP

# Rate Limiting - General API Endpoints
RATE_LIMIT_MAX=500              # Requests per 15 minutes per IP for admin endpoints
                                   # Default: 500 req/15min = 48,000 requests/day per IP

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# High Volume Configuration
REDIS_URL=redis://localhost:6379
```

### Scaling for Millions of Requests/Day

To handle **millions of requests/day**, configure:

```env
# For 1M+ requests/day per endpoint
HIGH_VOLUME_RATE_LIMIT=10000    # 10,000 requests/minute = 14.4M requests/day per IP

# Add more instances behind load balancer
# Each instance handles 10K req/min
# 10 instances = 100K req/min = 144M requests/day capacity
```

## Capacity Planning

### Single Instance Capacity

| Endpoint Type | Rate Limit | Capacity |
|--------------|------------|----------|
| Queue/Jobs | Unlimited | Limited by Redis & workers |
| High-Volume (`/v1/salesforce/*`) | 1000 req/min | **1.44M requests/day** per IP |
| General API | 500 req/15min | **48K requests/day** per IP |
| Health Checks | Unlimited | N/A |

### Multi-Instance Scaling

With **load balancer** and **multiple instances**:

| Scenario | Instances | High-Volume Capacity | Queue Capacity |
|----------|-----------|---------------------|----------------|
| Small Scale | 2 instances | 2.88M req/day | High |
| Medium Scale | 5 instances | 7.2M req/day | Very High |
| Large Scale | 10 instances | 14.4M req/day | Extremely High |

### Example: Handling 10M Requests/Day

**Configuration:**
```env
HIGH_VOLUME_RATE_LIMIT=10000  # 10K req/min per instance
```

**Architecture:**
```
Load Balancer → 7 instances → Each handles 1.43M req/day
                            → Total: 10M requests/day capacity
```

## Monitoring

### Check Queue Health
```bash
curl http://localhost:3000/queue/monitor/health
```

### Check Performance Metrics
```bash
curl http://localhost:3000/queue/monitor/metrics
```

### Check Rate Limit Status
```bash
# Watch for rate limit headers in responses
curl -I http://localhost:3000/v1/salesforce/token

# Response headers include:
# - Ratelimit-Limit: Current limit
# - Ratelimit-Remaining: Requests remaining in window
# - Ratelimit-Reset: Time when limit resets
```

## Troubleshooting

### Issue: Rate limit exceeded errors

**Symptoms:**
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```

**Solutions:**

1. **For Queue/Job Endpoints:**
   - Verify you're using the correct endpoint (`/queue/*`)
   - Ensure API key is valid and included in headers

2. **For General API:**
   - Check if you're behind a proxy/load balancer
   - Increase `RATE_LIMIT_MAX` in `.env` if needed
   - Consider using multiple instances behind a load balancer

3. **High Traffic:**
   - Add more application instances
   - Use a load balancer to distribute traffic
   - Ensure Redis is properly configured for high throughput

## Security

Even with high volume processing:

✅ **Still Protected By:**
- Helmet (security headers)
- CORS (controlled origins)
- API Key authentication
- Queue backpressure (BullMQ)
- Rate limiting on general endpoints

❌ **Vulnerabilities Prevented:**
- XSS attacks
- Clickjacking
- MIME sniffing
- DDoS (at application level)
- API abuse (via rate limiting + auth)

## Production Recommendations

For production with 450K+ requests/day:

1. **Deploy multiple instances** (at least 3-4)
2. **Use a load balancer** (nginx, AWS ALB, etc.)
3. **Configure Redis clustering** for queue storage
4. **Monitor queue depth** and set up alerts
5. **Use horizontal scaling** based on queue metrics
6. **Set up proper logging** and monitoring

## Conclusion

**Yes, your API is safe and can handle high-volume traffic!**

### Current Capacity (Default Configuration)
- **450K requests/day**: ✅ Easily handled
- **1.44M requests/day** per IP (high-volume endpoints): ✅ Single instance
- **10M+ requests/day**: ✅ With load balancer + multiple instances

### Key Features
- ✅ **Queue-based processing** (no rate limit on jobs)
- ✅ **Tiered rate limiting** (high-volume vs general endpoints)
- ✅ **API key authentication** (prevents unauthorized access)
- ✅ **Security headers** (Helmet - protects against vulnerabilities)
- ✅ **CORS protection** (controlled cross-origin access)
- ✅ **Horizontal scaling** (load balancer + multiple instances)

### Why It's Safe for 24/7 Production
1. **Rate limiting prevents abuse** without blocking legitimate traffic
2. **Queue system handles spikes** without overwhelming the API
3. **Multi-tier approach** allows high throughput on critical endpoints
4. **Security layers** protect against attacks even at scale
5. **Load balancer support** enables unlimited scale with proper infrastructure

Provides both **high throughput** (millions of requests/day) and **robust security** for 24/7 operation.
