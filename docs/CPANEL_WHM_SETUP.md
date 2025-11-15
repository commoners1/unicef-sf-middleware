# cPanel/WHM Setup Guide - High Volume Application (450k jobs/day)

This guide shows how to replicate the `docker-compose.high-volume.yml` setup on cPanel/WHM without Docker.

## 🎯 What This Replicates

From `docker-compose.high-volume.yml`:

| Docker Service | cPanel Equivalent | Purpose |
|----------------|------------------|---------|
| `app` (2 replicas) | Main Node.js app (PM2) | API server on port 3000 |
| `workers` (3 replicas) | 3 Worker processes (PM2) | Background job processing |
| `redis-cluster` | Redis Server | Queue management (BullMQ) |
| `postgres` | PostgreSQL 15 | Database with optimizations |
| `monitoring` | Optional: Prometheus | Monitoring dashboard |

---

## ✅ Prerequisites

- **cPanel/WHM** with root or reseller access
- **Node.js 18+**
- **PostgreSQL 15+**
- **Redis 7+**
- **PM2** (process manager)
- **Nginx/Apache** (web server)

### System Requirements

- **RAM**: 16GB (8GB minimum)
- **CPU**: 8 cores (4 minimum)
- **Storage**: 100GB+ SSD
- **OS**: CentOS 7/8, CloudLinux, or similar

---

## 📦 Step 1: Install Required Software

```bash
# SSH into your server
ssh root@your-server.com

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
node --version

# Install PostgreSQL 15
yum install -y postgresql15-server postgresql15
postgresql-setup --initdb
systemctl enable postgresql
systemctl start postgresql

# Install Redis 7
yum install -y redis7
systemctl enable redis
systemctl start redis

# Install PM2
npm install -g pm2
pm2 startup systemd
# Follow the output command, then:
pm2 save
```

---

## 📂 Step 2: Setup Application Directory

```bash
# Create application directory
mkdir -p /opt/sf-middleware
cd /opt/sf-middleware

# Upload your code (via Git, SCP, or FTP)
git clone https://your-repo/sf-middleware.git .
# OR use SCP: scp -r . root@server:/opt/sf-middleware/

# Install dependencies
npm install
npm run build

# Generate Prisma client
npx prisma generate
```

---

## 🗄️ Step 3: Setup PostgreSQL Database

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

---

## ⚙️ Step 4: Configure PostgreSQL (High Volume)

Edit `/var/lib/pgsql/15/data/postgresql.conf`:

```bash
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

---

## 🔴 Step 5: Configure Redis

Edit `/etc/redis/redis.conf`:

```bash
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

---

## 🔐 Step 6: Create Environment File

Create `/opt/sf-middleware/.env`:

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

# Redis (from docker: redis://redis-cluster:6379)
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
QUEUE_NAME=sf-queue
SALESFORCE_CONCURRENCY=20
EMAIL_CONCURRENCY=20
NOTIFICATION_CONCURRENCY=20
```

---

## 🚀 Step 7: Setup PM2 (Process Manager)

Create `/opt/sf-middleware/ecosystem.config.js`:

```bash
cd /opt/sf-middleware
nano ecosystem.config.js
```

**Content:**

```javascript
module.exports = {
  apps: [
    // Main Application (replaces docker app service with 2 replicas)
    {
      name: 'sf-middleware-app',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '2G',
      // Monitor mode
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
    
    // Background Worker 1 - Salesforce (replaces docker workers service with 3 replicas)
    {
      name: 'sf-worker-salesforce',
      script: './dist/main.js',
      args: 'worker:start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'salesforce',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      max_memory_restart: '1G',
      autorestart: true,
    },
    
    // Background Worker 2 - Email
    {
      name: 'sf-worker-email',
      script: './dist/main.js',
      args: 'worker:start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'email',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      max_memory_restart: '1G',
      autorestart: true,
    },
    
    // Background Worker 3 - Notifications
    {
      name: 'sf-worker-notifications',
      script: './dist/main.js',
      args: 'worker:start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'notifications',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      max_memory_restart: '1G',
      autorestart: true,
    },
  ],
};
```

**Create logs directory:**

```bash
mkdir -p /opt/sf-middleware/logs
```

**Start the application:**

```bash
cd /opt/sf-middleware
pm2 start ecosystem.config.js
pm2 save

# Check status
pm2 status

# View logs
pm2 logs
```

---

## 🌐 Step 8: Setup Nginx Reverse Proxy

Create `/etc/nginx/conf.d/sf-middleware.conf`:

```bash
nano /etc/nginx/conf.d/sf-middleware.conf
```

**Content:**

```nginx
upstream sf_middleware {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (setup with Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
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

    # Rate limiting for high volume
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=1000r/m;
    limit_req zone=api_limit burst=20 nodelay;
}
```

**Test and reload Nginx:**

```bash
nginx -t
systemctl reload nginx
```

---

## 🔒 Step 9: Setup SSL Certificate (Let's Encrypt)

```bash
# Install certbot
yum install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d api.yourdomain.com

# Auto-renewal is set up automatically
certbot renew --dry-run
```

---

## 🔥 Step 10: Configure Firewall

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

## 📊 Step 11: Monitoring & Health Checks

### Check Application Status

```bash
# PM2 status
pm2 status

# View logs
pm2 logs sf-middleware-app

# Monitor resources
pm2 monit

# Restart application
pm2 restart sf-middleware-app
```

### Health Check Endpoints

```bash
# Application health
curl https://api.yourdomain.com/health

# Queue monitor
curl https://api.yourdomain.com/queue/monitor/health

# Detailed metrics
curl https://api.yourdomain.com/queue/monitor/detailed
```

### Database Monitoring

```bash
# Connect to database
psql -U sfuser -d sfapi

# Check database size
SELECT pg_size_pretty(pg_database_size('sfapi'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Redis Monitoring

```bash
# Connect to Redis
redis-cli

# Check Redis info
INFO

# Check memory
INFO memory

# Monitor commands (real-time)
MONITOR

# Check queue length
LLEN bull:salesforce:wait
LLEN bull:email:wait
LLEN bull:notifications:wait
```

### System Monitoring

```bash
# Check system resources
htop
# OR
top

# Check disk usage
df -h

# Check memory
free -h

# Check network connections
netstat -tulpn | grep :3000
```

---

## 🔄 Step 12: Setup Auto-Start (Optional)

Create systemd service for PM2:

```bash
# PM2 startup was already configured, but if not:
pm2 startup systemd

# Follow the output command, example:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

---

## 🛠️ Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs sf-middleware-app --lines 50

# Check if port is in use
netstat -tulpn | grep :3000

# Restart PM2
pm2 restart all
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart if needed
pm2 restart sf-middleware-app

# Adjust max_memory_restart in ecosystem.config.js
```

### Database Connection Issues

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check PostgreSQL logs
tail -f /var/lib/pgsql/15/data/log/postgresql-*.log

# Test connection
psql -U sfuser -d sfapi -c "SELECT 1;"
```

### Redis Connection Issues

```bash
# Check Redis status
systemctl status redis

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Test Redis connection
redis-cli ping
```

### High CPU Usage

```bash
# Check CPU usage
top

# Check specific process
ps aux | grep node

# Restart workers if needed
pm2 restart sf-worker-salesforce
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

### Optimization Tips

1. **Database**: Regularly run `VACUUM ANALYZE`, monitor slow queries
2. **Redis**: Monitor memory, set TTL for keys
3. **Node.js**: Enable production mode, monitor memory leaks
4. **Network**: Use HTTP/2, enable compression

---

## 🔐 Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Setup SSL certificates (HTTPS)
- [ ] Configure firewall rules
- [ ] Enable fail2ban for SSH
- [ ] Regular security updates
- [ ] Daily database backups
- [ ] Monitor logs for suspicious activity
- [ ] Use strong JWT secrets
- [ ] Implement rate limiting
- [ ] Restrict database access (localhost only)

---

## 📝 Maintenance Schedule

### Daily
- Check application health
- Monitor queue depth
- Review error logs

### Weekly
- Database vacuum and analyze
- Review slow queries
- Check disk space

### Monthly
- Security updates
- Performance review
- Backup verification
- Review system logs

---

## 🆘 Useful Commands

```bash
# View all logs
pm2 logs

# Restart all services
pm2 restart all
systemctl restart postgresql
systemctl restart redis

# Check service status
systemctl status postgresql
systemctl status redis
pm2 status

# View logs
tail -f /opt/sf-middleware/logs/app-error.log
tail -f /var/lib/pgsql/15/data/log/postgresql-*.log
tail -f /var/log/redis/redis-server.log
```

---

## 📚 Useful Files

- Application logs: `/opt/sf-middleware/logs/`
- PostgreSQL logs: `/var/lib/pgsql/15/data/log/`
- Redis logs: `/var/log/redis/`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `~/.pm2/logs/`

---

**Last Updated:** 15 November 2025

For Docker-specific setup, refer to `docker-compose.high-volume.yml`
