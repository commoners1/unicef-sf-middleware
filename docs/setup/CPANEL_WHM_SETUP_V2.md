# cPanel/WHM Setup Guide V2 - Complete Application Setup

This comprehensive guide shows how to deploy **both sf-middleware (API backend) and sf-dashboard (Admin panel)** on cPanel/WHM without Docker for high-volume production use (450k+ jobs/day).

---

## 🎯 What This Guide Covers

### Components Deployed

| Component | Description | URL | Port |
|-----------|-------------|-----|------|
| **sf-middleware** | API Backend + Workers (NestJS with BullMQ) | https://api.thesubdomain.mydomain.com | 3000 |
| **sf-dashboard** | Admin Dashboard (React/Vite) | https://thesubdomain.mydomain.com | - |
| **PostgreSQL 15** | Database | localhost:5432 | 5432 |
| **Redis 7** | Queue Management | localhost:6379 | 6379 |
| **Nginx** | Reverse Proxy | - | 80/443 |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      cPanel/WHM Server                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Nginx (Port 443) │         │  Nginx (Port 443) │            │
│  │  api.thesubdomain.mydomain.com│         │thesubdomain.mydomain.com │      │
│  └────────┬─────────┘         └─────────┬────────┘             │
│           │                              │                      │
│           ▼                              ▼                      │
│  ┌─────────────────────────────────────────────────┐            │
│  │         sf-middleware (NestJS + PM2)             │            │
│  │         Port: 3000 (2 cluster instances)        │            │
│  │                                                  │            │
│  │  ┌──────────────┐  ┌──────────────────────┐   │            │
│  │  │  REST API    │  │  BullMQ Processors   │   │            │
│  │  │  Endpoints   │  │  (Workers)           │   │            │
│  │  │              │  │  - Salesforce      │   │            │
│  │  │  /api/*      │  │  - Email           │   │            │
│  │  │  /auth/*      │  │  - Notifications   │   │            │
│  │  └──────────────┘  └──────────────────────┘   │            │
│  │                                                  │            │
│  │  ⚡ Workers run automatically via @nestjs/bullmq │            │
│  │     No separate worker processes needed!        │            │
│  └────────┬─────────────────────────────────────────┘            │
│           │                                                     │
│           └──────────────┬───────────────────────┐              │
│                          ▼                       ▼              │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  PostgreSQL 15   │         │    Redis 7       │             │
│  │  Port: 5432      │         │  Port: 6379      │             │
│  │                  │         │  (Job Queues)    │             │
│  └──────────────────┘         └──────────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Important Architecture Note:**
- **sf-middleware** is a unified NestJS application that handles **both REST API and background job processing**
- Workers are **NOT separate processes** - they run as BullMQ processors (`@nestjs/bullmq`) within the NestJS app
- Each PM2 instance runs the complete NestJS application with:
  - REST API endpoints
  - BullMQ queue processors (automatically process jobs from Redis)
  - Scheduled cron jobs (via `@nestjs/schedule`)
- Workers process jobs automatically when the app starts - no separate `worker:start` command needed

---

## ✅ Prerequisites

### System Requirements

- **OS**: CentOS 7/8, CloudLinux, or similar (typical cPanel/WHM)
- **RAM**: 16GB (8GB minimum)
- **CPU**: 8 cores (4 minimum)
- **Storage**: 100GB+ SSD
- **Access**: Root or reseller SSH access

### Required Software

- cPanel/WHM installed
- Node.js 18+ (we'll install)
- PostgreSQL 15+ (we'll install)
- Redis 7+ (we'll install)
- PM2 (we'll install)
- Nginx (typically pre-installed)

---

## 📦 Step 1: Install Required Software

```bash
# SSH into your cPanel/WHM server
ssh root@your-server.com

# Update system packages
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
node --version
npm --version

# Install PostgreSQL 15
yum install -y postgresql15-server postgresql15
postgresql-setup --initdb
systemctl enable postgresql
systemctl start postgresql

# Install Redis 7
yum install -y redis7
systemctl enable redis
systemctl start redis

# Install PM2 globally
npm install -g pm2
pm2 startup systemd
# Follow the output command, then:
pm2 save

# Verify installations
node --version    # Should be v18+
psql --version    # Should be 15+
redis-cli --version  # Should be 7+
pm2 --version
```

---

## 📂 Step 2: Setup sf-middleware (API Backend)

### 2.1 Create Application Directory

```bash
# Create application directory
mkdir -p /opt/sf-middleware
cd /opt/sf-middleware

# Upload your code (via Git, SCP, or cPanel File Manager)
# Option 1: Clone from Git
git clone https://your-repo/sf-project.git temp
mv temp/sf-middleware/* .
rm -rf temp

# Option 2: Upload via cPanel File Manager
# Extract to /opt/sf-middleware/

# Install dependencies
npm install

# Build the application
npm run build

# Generate Prisma client
npx prisma generate
```

### 2.2 Setup PostgreSQL Database

```bash
# Switch to postgres user
su - postgres

# Create database and user
psql << EOF
CREATE DATABASE sfapi;
CREATE USER sfuser WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sfapi TO sfuser;
ALTER DATABASE sfapi OWNER TO sfuser;
\q
EOF

# Exit postgres user
exit

# Run migrations
cd /opt/sf-middleware
npx prisma migrate deploy

# Create high-volume indexes
psql -U sfuser -d sfapi -f scripts/create-indexes.sql
```

### 2.3 Configure PostgreSQL (High Volume)

```bash
# Edit PostgreSQL configuration
nano /var/lib/pgsql/15/data/postgresql.conf
```

**Add/modify these settings:**

```conf
# High-volume PostgreSQL configuration
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 1GB
min_wal_size = 80MB
effective_io_concurrency = 200
random_page_cost = 1.1

# Autovacuum for high volume
autovacuum_max_workers = 3
autovacuum_naptime = 20s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

**Restart PostgreSQL:**

```bash
systemctl restart postgresql
```

### 2.4 Configure Redis

```bash
# Edit Redis configuration
nano /etc/redis/redis.conf
```

**Add/modify these settings:**

```conf
# High-volume Redis configuration
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
appendonly yes
save 900 1
save 300 10
save 60 10000
```

**Restart Redis:**

```bash
systemctl restart redis

# Test Redis
redis-cli ping
```

### 2.5 Create Environment File

```bash
cd /opt/sf-middleware
nano .env
```

**Add all environment variables:**

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://sfuser:your_secure_password_here@localhost:5432/sfapi

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Salesforce API
SF_BASE_ENDPOINT=https://your-salesforce-endpoint.com
SF_CLIENT_ID=your-client-id
SF_CLIENT_SECRET=your-client-secret
SF_RESOURCE_API=your-resource-api-endpoint
SF_TOKEN_URL=https://your-token-endpoint.com
SF_SUBSCRIPTION_KEY=your-subscription-key
SF_SUBSCRIPTION_PAYMENT_KEY=your-payment-key

# Queue Configuration (High Volume)
# Note: These control concurrency for BullMQ processors within the NestJS app
# Workers run automatically - no separate worker processes needed
QUEUE_NAME=sf-queue
SALESFORCE_CONCURRENCY=20  # Jobs processed concurrently per instance
EMAIL_CONCURRENCY=20       # Email jobs processed concurrently per instance
NOTIFICATION_CONCURRENCY=20 # Notification jobs processed concurrently per instance

# CORS (Allow dashboard to access API)
CORS_ORIGIN=https://thesubdomain.mydomain.com

# Rate Limiting
HIGH_VOLUME_RATE_LIMIT=1000
RATE_LIMIT_MAX=500
```

### 2.6 Create PM2 Configuration

```bash
cd /opt/sf-middleware
nano ecosystem.config.js
```

**Content:**

```javascript
// Production PM2 Configuration (High Volume)
// Note: Workers (BullMQ processors) run automatically within the NestJS app
// No separate worker processes needed - the app handles both REST API and job processing
module.exports = {
  apps: [
    // Main Application (handles both REST API and queue workers)
    // Each instance processes jobs automatically via BullMQ processors
    {
      name: 'sf-middleware-prod',
      script: './dist/main.js',
      instances: 2, // 2 instances for high availability and load distribution
      exec_mode: 'cluster', // Cluster mode for better performance
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env',
      error_file: './logs/prod-error.log',
      out_file: './logs/prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '2G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      // High availability settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
```

**Important Notes:**
- **Workers run automatically**: The NestJS application uses `@nestjs/bullmq` processors (SalesforceProcessor, EmailProcessor, NotificationProcessor) which automatically process jobs from Redis queues
- **No separate worker processes**: Workers are part of the NestJS application module system, not separate Node.js processes
- **Each instance handles both**: Every PM2 instance runs the full NestJS app which includes:
  - REST API endpoints (on port 3000)
  - BullMQ queue processors (automatically process jobs from Redis)
  - Cron jobs (via @nestjs/schedule)
- **Scaling**: Increase `instances` to scale both API and workers together, or use separate PM2 apps if you need different scaling ratios

**Create logs directory and start:**

```bash
mkdir -p /opt/sf-middleware/logs

# Start the application
cd /opt/sf-middleware
pm2 start ecosystem.config.js
pm2 save

# Check status
pm2 status

# View logs
pm2 logs sf-middleware-prod

# Monitor resources
pm2 monit
```

---

## 📂 Step 3: Setup sf-dashboard (Admin Panel)

### 3.1 Create Dashboard Directory

```bash
# Create dashboard directory
mkdir -p /opt/sf-dashboard
cd /opt/sf-dashboard

# Upload your code (via Git, SCP, or cPanel File Manager)
# Option 1: Clone from Git
git clone https://your-repo/sf-project.git temp
mv temp/sf-dashboard/* .
rm -rf temp

# Option 2: Upload via cPanel File Manager
# Extract to /opt/sf-dashboard/

# Install dependencies
npm install

# Build for production
npm run build
```

### 3.2 Create Production Environment Configuration

```bash
cd /opt/sf-dashboard
nano .env.production
```

**Add environment variables:**

```env
VITE_API_URL=https://api.thesubdomain.mydomain.com
VITE_WS_URL=wss://api.thesubdomain.mydomain.com
VITE_APP_TITLE=SF Middleware Dashboard
VITE_APP_VERSION=1.0.0
```

**Build with production environment:**

```bash
# Rebuild with production environment
npm run build

# Verify build output
ls -la dist/
```

### 3.3 Copy Built Files to Web Directory

```bash
# Navigate to your cPanel user's public_html directory
# Replace 'USER' with your actual cPanel username
# Replace 'thesubdomain' with your actual subdomain name
cd /home/USER/public_html/thesubdomain.mydomain.com

# If the directory doesn't exist, create it
mkdir -p /home/USER/public_html/thesubdomain.mydomain.com

# Copy built files
cp -r /opt/sf-dashboard/dist/* /home/USER/public_html/thesubdomain.mydomain.com/

# Set proper permissions
chown -R USER:USER /home/USER/public_html/thesubdomain.mydomain.com
chmod -R 755 /home/USER/public_html/thesubdomain.mydomain.com
```

---

## 🌐 Step 4: Setup Nginx Reverse Proxy

### 4.1 Configure API Proxy

```bash
# Create Nginx configuration for API
nano /etc/nginx/conf.d/sf-api.conf
```

**Content:**

```nginx
upstream sf_middleware {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP redirect to HTTPS for API
server {
    listen 80;
    server_name api.thesubdomain.mydomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration for API
server {
    listen 443 ssl http2;
    server_name api.thesubdomain.mydomain.com;

    # SSL certificates (setup with Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.thesubdomain.mydomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.thesubdomain.mydomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Body size limit
    client_max_body_size 10M;

    # Proxy to sf-middleware
    location / {
        proxy_pass http://sf_middleware;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for high volume
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://sf_middleware;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Rate limiting for high volume
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=1000r/m;
    limit_req zone=api_limit burst=20 nodelay;
}
```

### 4.2 Configure Dashboard

```bash
# Create Nginx configuration for Dashboard
nano /etc/nginx/conf.d/sf-dashboard.conf
```

**Content:**

```nginx
# HTTP redirect to HTTPS for Dashboard
server {
    listen 80;
    server_name thesubdomain.mydomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration for Dashboard
server {
    listen 443 ssl http2;
    server_name thesubdomain.mydomain.com;

    # SSL certificates (setup with Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/thesubdomain.mydomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/thesubdomain.mydomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Root directory
    # Replace 'USER' with your actual cPanel username
    root /home/USER/public_html/thesubdomain.mydomain.com;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (for CORS and API calls from dashboard)
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Test and reload Nginx:**

```bash
# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## 🔒 Step 5: Setup SSL Certificates (Let's Encrypt)

### 5.1 Install Certbot

```bash
# Install certbot
yum install -y certbot python3-certbot-nginx
```

### 5.2 Obtain Certificates

```bash
# Obtain certificate for API
certbot --nginx -d api.thesubdomain.mydomain.com

# Obtain certificate for Dashboard
certbot --nginx -d thesubdomain.mydomain.com

# Test auto-renewal
certbot renew --dry-run
```

### 5.3 Setup Auto-Renewal

```bash
# Certbot should have already set up auto-renewal
# Verify cron job
crontab -l | grep certbot

# If not present, add it
echo "0 0,12 * * * root certbot renew --quiet" >> /etc/crontab
```

---

## 🔥 Step 6: Configure Firewall

```bash
# Allow HTTP/HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# Allow PostgreSQL (if remote access needed)
firewall-cmd --permanent --add-service=postgresql

# Allow Redis (if remote access needed)
firewall-cmd --permanent --add-port=6379/tcp

# Reload firewall
firewall-cmd --reload
```

---

## 📊 Step 7: Testing & Verification

### 7.1 Check Service Status

```bash
# Check PM2 status
pm2 status

# Check PostgreSQL
systemctl status postgresql

# Check Redis
systemctl status redis

# Check Nginx
systemctl status nginx
```

### 7.2 Test API Endpoints

```bash
# Health check
curl https://api.thesubdomain.mydomain.com/health

# Detailed health check
curl https://api.thesubdomain.mydomain.com/healthz

# Queue monitor
curl https://api.thesubdomain.mydomain.com/queue/monitor/health
```

### 7.3 Test Dashboard

```bash
# Open in browser
# https://thesubdomain.mydomain.com

# Or test with curl
curl -I https://thesubdomain.mydomain.com
```

### 7.4 View Logs

```bash
# PM2 logs (all instances)
pm2 logs sf-middleware-prod

# PM2 logs for specific instance
pm2 logs sf-middleware-prod --lines 50

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f /opt/sf-middleware/logs/prod-error.log
tail -f /opt/sf-middleware/logs/prod-out.log
```

---

## 🔄 Step 8: Setup Auto-Start

PM2 should already be configured for auto-start. Verify:

```bash
# Check PM2 startup configuration
pm2 startup

# Save current PM2 process list
pm2 save
```

---

## 🛠️ Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs sf-middleware-prod --lines 50

# Check if port 3000 is in use
netstat -tulpn | grep :3000

# Restart PM2
pm2 restart all
```

### High Memory Usage

```bash
# Monitor memory
pm2 monit

# Check memory usage
free -h

# Restart if needed
pm2 restart sf-middleware-prod
```

### Database Connection Issues

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check PostgreSQL logs
tail -f /var/lib/pgsql/15/data/log/postgresql-*.log

# Test connection
psql -U sfuser -d sfapi -c "SELECT 1;"

# Check DATABASE_URL in .env
cat /opt/sf-middleware/.env | grep DATABASE_URL
```

### Redis Connection Issues

```bash
# Check Redis status
systemctl status redis

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Test Redis connection
redis-cli ping

# Check REDIS_URL in .env
cat /opt/sf-middleware/.env | grep REDIS_URL
```

### Dashboard Not Loading

```bash
# Check file permissions (replace USER with your cPanel username)
ls -la /home/USER/public_html/thesubdomain.mydomain.com/

# Check Nginx configuration
nginx -t

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Verify build output
ls -la /opt/sf-dashboard/dist/

# Check if index.html exists
ls -la /home/USER/public_html/thesubdomain.mydomain.com/index.html
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/api.thesubdomain.mydomain.com/fullchain.pem -text -noout

# Check certificate expiration
certbot certificates

# Renew certificates if needed
certbot renew
```

### CORS Issues

```bash
# Check CORS_ORIGIN in .env
cat /opt/sf-middleware/.env | grep CORS_ORIGIN

# Should match your dashboard URL
# Example: CORS_ORIGIN=https://thesubdomain.mydomain.com

# Restart after changes
pm2 restart sf-middleware-prod
```

---

## 📈 Performance Optimization

### Expected Performance

With this setup, you should achieve:

- ✅ **450,000+ jobs/day** sustained capacity
- ✅ **<2 second** average processing time
- ✅ **<1%** error rate
- ✅ **<100 jobs** queue depth under normal load
- ✅ **99.9%** uptime
- ✅ **Dashboard load time < 3 seconds**

### Optimization Tips

1. **Database**
   - Regularly run `VACUUM ANALYZE`
   - Monitor slow queries
   - Create appropriate indexes

2. **Redis**
   - Monitor memory usage
   - Set TTL for keys
   - Use appropriate eviction policies

3. **Node.js**
   - Enable production mode
   - Monitor memory leaks
   - Use PM2 cluster mode

4. **Network**
   - Use HTTP/2
   - Enable gzip compression
   - Configure caching headers

5. **Dashboard**
   - Optimize bundle size
   - Enable browser caching
   - Use CDN for static assets

---

## 🔐 Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Setup SSL certificates (HTTPS)
- [ ] Configure firewall rules
- [ ] Enable fail2ban for SSH
- [ ] Use strong JWT secrets
- [ ] Implement rate limiting
- [ ] Restrict database access (localhost only)
- [ ] Configure CORS properly
- [ ] Enable security headers
- [ ] Regular security updates
- [ ] Daily database backups
- [ ] Monitor logs for suspicious activity

---

## 📝 Maintenance Schedule

### Daily
- Check application health
- Monitor queue depth
- Review error logs
- Check disk space

### Weekly
- Database vacuum and analyze
- Review slow queries
- Check system logs
- Verify backups

### Monthly
- Security updates
- Performance review
- Backup verification
- Review system metrics
- Update dependencies

---

## 🆘 Useful Commands

```bash
# ===========================
# PM2 Management
# ===========================
pm2 status                    # View all processes
pm2 logs                      # View all logs
pm2 logs sf-middleware-prod   # View specific app logs
pm2 restart all               # Restart all processes
pm2 monit                     # Monitor resources
pm2 stop all                  # Stop all processes
pm2 save                      # Save current process list

# ===========================
# Service Management
# ===========================
systemctl status postgresql   # PostgreSQL status
systemctl status redis        # Redis status
systemctl status nginx        # Nginx status
systemctl restart postgresql  # Restart PostgreSQL
systemctl restart redis       # Restart Redis
systemctl reload nginx        # Reload Nginx

# ===========================
# Database Management
# ===========================
psql -U sfuser -d sfapi       # Connect to database
\dt                           # List tables
SELECT version();             # Check PostgreSQL version
\q                            # Exit psql

# ===========================
# Redis Management
# ===========================
redis-cli                     # Connect to Redis
INFO                          # View Redis info
INFO memory                   # View memory info
MONITOR                       # Monitor commands
EXIT                          # Exit redis-cli

# ===========================
# View Logs
# ===========================
tail -f /opt/sf-middleware/logs/prod-error.log
tail -f /var/lib/pgsql/15/data/log/postgresql-*.log
tail -f /var/log/redis/redis-server.log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# ===========================
# System Monitoring
# ===========================
htop                          # Process monitor
df -h                         # Disk usage
free -h                       # Memory usage
netstat -tulpn | grep :3000   # Check port usage
```

---

## 📚 Useful Files

### Application Files

- **sf-middleware logs**: `/opt/sf-middleware/logs/`
- **sf-dashboard build**: `/opt/sf-dashboard/dist/`
- **Dashboard public**: `/home/USER/public_html/thesubdomain.mydomain.com/` (replace USER with your cPanel username)
- **Environment files**: `/opt/sf-middleware/.env`

### System Files

- **PostgreSQL logs**: `/var/lib/pgsql/15/data/log/`
- **Redis logs**: `/var/log/redis/`
- **Nginx logs**: `/var/log/nginx/`
- **PM2 logs**: `~/.pm2/logs/`

### Configuration Files

- **Nginx config**: `/etc/nginx/conf.d/sf-api.conf`, `/etc/nginx/conf.d/sf-dashboard.conf`
- **PostgreSQL config**: `/var/lib/pgsql/15/data/postgresql.conf`
- **Redis config**: `/etc/redis/redis.conf`
- **PM2 config**: `/opt/sf-middleware/ecosystem.config.js`

---

## 🎉 Deployment Complete!

Your **sf-middleware** and **sf-dashboard** are now running on cPanel/WHM!

### Access URLs

- **API Backend**: https://api.thesubdomain.mydomain.com
- **Admin Dashboard**: https://thesubdomain.mydomain.com

### Next Steps

1. **Initial Setup**
   - Login to dashboard (create admin user if needed)
   - Configure environment settings
   - Create API keys
   - Test API endpoints

2. **Production Hardening**
   - Setup database backups
   - Configure monitoring alerts
   - Setup log rotation
   - Review security settings

3. **Scaling** (if needed)
   - Add more worker instances
   - Scale PostgreSQL
   - Add Redis cluster
   - Configure load balancing

---

## 📞 Support

For issues and questions:

1. Check troubleshooting section above
2. Review application logs
3. Verify environment variables
4. Test health endpoints
5. Check system resources

**Last Updated:** 15 November 2025

For additional information, refer to:
- [Multi-Environment Setup](MULTI_ENVIRONMENT_SETUP.md)
- [API Documentation](API_DOCUMENTATION.md)
- [High Volume Setup](HIGH_VOLUME_SETUP.md)

