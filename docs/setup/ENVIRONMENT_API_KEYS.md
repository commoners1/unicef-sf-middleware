# Environment-Specific API Keys

This document explains how to use API keys across different environments (development, staging, production) in the SF Middleware.

## 🎯 **Overview**

Users can now have separate API keys for each environment:
- **Development** - For local development and testing
- **Staging** - For testing and integration
- **Production** - For live production use
- **Production2** - For secondary production environment (if configured)

## 🔧 **How It Works**

### **Environment Detection**

The system automatically detects the environment from:

1. **Subdomain** (Recommended)
   - `localhost:3000` → Development
   - `staging-api.yourdomain.com` → Staging
   - `api.yourdomain.com` → Production

2. **Header** (Alternative)
   - `x-environment: development`
   - `x-environment: staging`
   - `x-environment: production`

3. **Environment Variable** (Fallback)
   - `NODE_ENV=development` → Development
   - `NODE_ENV=staging` → Staging
   - `NODE_ENV=production` → Production

### **API Key Validation**

Each API key is tied to a specific environment. A key created for staging won't work in production and vice versa.

**Security Features:**
- API keys are stored with **SHA-256 hash** for fast validation lookup
- Keys are **encrypted** for secure storage and retrieval
- Each user can have only **one API key per environment**
- Keys are validated against both the hash and the encrypted version

## 🚀 **API Endpoints**

### **Generate API Key**

```bash
POST /api-key/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "My Production Key",
  "description": "For production use",
  "permissions": ["read", "write"],
  "environment": "production"
}
```

**Response:**
```json
{
  "key": "sk_abc123...",
  "environment": "production",
  "name": "My Production Key"
}
```

### **Get All API Keys**

```bash
GET /api-key/keys
Authorization: Bearer <jwt-token>
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
    "createdAt": "2025-01-01T00:00:00Z"
  },
  {
    "id": "key2",
    "key": "sk_def456...",
    "name": "Production Key",
    "environment": "production",
    "permissions": ["read", "write"],
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### **Get Keys by Environment**

```bash
GET /api-key/keys/staging
Authorization: Bearer <jwt-token>
```

### **Revoke API Key**

```bash
POST /api-key/revoke
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "key": "sk_abc123..."
}
```

### **Delete API Key**

```bash
POST /api-key/delete
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "key": "sk_abc123..."
}
```

## 🌐 **Environment URLs**

| Environment | URL | Description |
|-------------|-----|-------------|
| Development | http://localhost:3000 | Local development |
| Staging | https://staging-api.yourdomain.com | Testing environment |
| Production | https://api.yourdomain.com | Live production |
| Production2 | https://api2.yourdomain.com | Secondary production (if configured) |

## 🔑 **API Key Usage**

### **Development**

```bash
# Using subdomain detection
curl -H "x-api-key: sk_dev_123..." \
     http://localhost:3000/v1/salesforce/token

# Using header
curl -H "x-api-key: sk_dev_123..." \
     -H "x-environment: development" \
     http://localhost:3000/v1/salesforce/token
```

### **Staging**

```bash
# Using subdomain detection
curl -H "x-api-key: sk_staging_123..." \
     https://staging-api.yourdomain.com/v1/salesforce/token

# Using header
curl -H "x-api-key: sk_staging_123..." \
     -H "x-environment: staging" \
     https://api.yourdomain.com/v1/salesforce/token
```

### **Production**

```bash
# Using subdomain detection
curl -H "x-api-key: sk_prod_123..." \
     https://api.yourdomain.com/v1/salesforce/token

# Using header
curl -H "x-api-key: sk_prod_123..." \
     -H "x-environment: production" \
     https://api.yourdomain.com/v1/salesforce/token
```

## 🛡️ **Security Features**

### **Environment Isolation**

- API keys are isolated by environment
- A staging key cannot access production data
- A development key cannot access staging data

### **Unique Constraint**

- Each user can have only **one API key per environment**
- Prevents key duplication and confusion

### **Environment Validation**

- Keys are validated against the current environment
- Invalid environment keys are rejected with clear error messages

## 📊 **Database Schema**

```sql
-- ApiKey table with environment support
CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,  -- Encrypted API key (for decryption/display)
  "keyHash" TEXT UNIQUE,  -- SHA-256 hash of plain key (for fast validation lookup)
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "permissions" TEXT[] NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'production',
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApiKey_userId_environment_key" UNIQUE ("userId", "environment"),
  CONSTRAINT "ApiKey_keyHash_key" UNIQUE ("keyHash")
);
```

**Key Storage:**
- `key`: Encrypted version of the API key (for decryption when displaying to user)
- `keyHash`: SHA-256 hash of the plain key (for fast validation lookup during authentication)
- Both are stored for different use cases: hash for fast validation, encrypted for retrieval

## 🔄 **Migration Guide**

### **For Existing Users**

1. **Existing API keys** will default to `production` environment
2. **Create new keys** for staging and development as needed
3. **Update your applications** to use environment-specific keys

### **For New Users**

1. **Create account** and get JWT token
2. **Generate keys** for each environment you need
3. **Use appropriate key** for each environment

## 🚨 **Error Handling**

### **Invalid Environment Key**

```json
{
  "statusCode": 401,
  "message": "Invalid API key for staging environment",
  "error": "Unauthorized"
}
```

### **Missing API Key**

```json
{
  "statusCode": 401,
  "message": "API key required",
  "error": "Unauthorized"
}
```

### **Inactive User**

```json
{
  "statusCode": 401,
  "message": "User account is inactive",
  "error": "Unauthorized"
}
```

## 💡 **Best Practices**

### **Key Management**

1. **Use descriptive names** for your API keys
2. **Rotate keys regularly** for security
3. **Use minimal permissions** (principle of least privilege)
4. **Store keys securely** (environment variables, secret managers)

### **Environment Separation**

1. **Never use production keys** in development
2. **Test with staging keys** before production
3. **Use different keys** for different applications
4. **Monitor key usage** across environments

### **Development Workflow**

1. **Start with development** environment
2. **Test with staging** environment
3. **Deploy to production** with production keys
4. **Monitor and maintain** all environments

## 🔧 **Configuration**

### **Environment Variables**

```env
# Development
NODE_ENV=development

# Staging
NODE_ENV=staging

# Production
NODE_ENV=production
```

### **Nginx Configuration**

```nginx
# Development
server {
    server_name localhost;
    # ... other config
}

# Staging
server {
    server_name staging-api.yourdomain.com;
    # ... other config
}

# Production
server {
    server_name api.yourdomain.com;
    # ... other config
}
```

## 🎉 **Benefits**

- ✅ **Environment Isolation** - Keys work only in their intended environment
- ✅ **Security** - Prevents accidental cross-environment access
- ✅ **Flexibility** - Different permissions per environment
- ✅ **Monitoring** - Track usage per environment
- ✅ **Compliance** - Meet security requirements
- ✅ **Scalability** - Easy to manage multiple environments

## 🆘 **Troubleshooting**

### **Key Not Working**

1. Check if the key is for the correct environment
2. Verify the key is active
3. Check if the user account is active
4. Verify the environment detection logic

### **Environment Detection Issues**

1. Check subdomain configuration
2. Verify header format
3. Check environment variables
4. Review Nginx configuration

### **Database Issues**

1. Run migrations: `npx prisma migrate deploy`
2. Check database connection
3. Verify schema is up to date
4. Check unique constraints

---

**Need help?** Check the [API Documentation](API_DOCUMENTATION.md) or contact support.
