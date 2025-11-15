# Clean VM Setup Guide - Salesforce Middleware

Complete guide for setting up the Salesforce Middleware application on a fresh virtual machine from scratch.

## 🎯 Overview

This guide will help you set up a production-ready Salesforce Middleware server on a clean VM, capable of handling **450,000+ jobs per day** with high availability and performance.

## 📋 Table of Contents

1. [System Requirements](#-system-requirements)
2. [VM Setup & OS Installation](#-vm-setup--os-installation)
3. [Initial Server Configuration](#-initial-server-configuration)
4. [Software Installation](#-software-installation)
5. [Database Setup](#-database-setup)
6. [Application Deployment](#-application-deployment)
7. [Web Server Configuration](#-web-server-configuration)
8. [Security Hardening](#-security-hardening)
9. [Monitoring & Logging](#-monitoring--logging)
10. [Performance Optimization](#-performance-optimization)
11. [Troubleshooting](#-troubleshooting)
12. [Maintenance](#-maintenance)

---

## 🖥️ System Requirements

### Minimum Requirements
- **CPU**: 4 cores (2.0 GHz+)
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 20.04 LTS / CentOS 8 / RHEL 8

### Recommended for Production
- **CPU**: 8+ cores (3.0 GHz+)
- **RAM**: 16GB+
- **Storage**: 100GB+ NVMe SSD
- **Network**: 10 Gbps
- **OS**: Ubuntu 22.04 LTS / CentOS Stream 9

### High-Volume Production (450k+ jobs/day)
- **CPU**: 16+ cores (3.5 GHz+)
- **RAM**: 32GB+
- **Storage**: 200GB+ NVMe SSD
- **Network**: 10 Gbps
- **OS**: Ubuntu 22.04 LTS

---

## 🖥️ VM Setup & OS Installation

### Step 1: Create Virtual Machine

#### For VMware vSphere:
1. Create new VM with recommended specs
2. Install Ubuntu 22.04 LTS Server
3. Configure network settings
4. Allocate storage (100GB+ recommended)

#### For VirtualBox:
1. Create new VM (Type: Linux, Version: Ubuntu 64-bit)
2. Allocate 8GB+ RAM, 4+ CPU cores
3. Create 100GB+ dynamic VDI
4. Enable PAE/NX, VT-x/AMD-V, Nested Paging

#### For Cloud Providers:
- **AWS**: t3.large or c5.2xlarge instances
- **Google Cloud**: e2-standard-4 or c2-standard-4
- **Azure**: Standard_D4s_v3 or Standard_F8s_v2
- **DigitalOcean**: 8GB/4 CPU droplet or higher

### Step 2: OS Installation

#### Ubuntu 22.04 LTS Installation:
```bash
# Download Ubuntu 22.04 LTS Server ISO
# Boot from ISO and follow installation wizard

# During installation, configure:
# - Hostname: sf-middleware-prod
# - Username: admin (or your preferred username)
# - Enable SSH server
# - Install OpenSSH server
# - Configure network (static IP recommended)
```

#### CentOS Stream 9 Installation:
```bash
# Download CentOS Stream 9 ISO
# Boot from ISO and follow installation wizard

# During installation:
# - Select "Server with GUI" or "Minimal Install"
# - Configure network
# - Set root password
# - Create user account
```

---

## ⚙️ Initial Server Configuration

### Step 1: Update System

#### Ubuntu/Debian:
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git vim htop net-tools unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

#### CentOS/RHEL:
```bash
# Update system
sudo dnf update -y

# Install essential packages
sudo dnf install -y curl wget git vim htop net-tools unzip epel-release
```

### Step 2: Configure Firewall

#### Ubuntu (UFW):
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS (will configure later)
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

#### CentOS/RHEL (firewalld):
```bash
# Enable firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Allow SSH
sudo firewall-cmd --permanent --add-service=ssh

# Allow HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload firewall
sudo firewall-cmd --reload
```

### Step 3: Configure Timezone and NTP

```bash
# Set timezone
sudo timedatectl set-timezone UTC

# Enable NTP
sudo timedatectl set-ntp true

# Verify
timedatectl status
```

### Step 4: Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash sfapp
sudo usermod -aG sudo sfapp

# Set password (optional, recommend SSH keys)
sudo passwd sfapp

# Create application directory
sudo mkdir -p /opt/sf-middleware
sudo chown sfapp:sfapp /opt/sf-middleware
```

---

## 📦 Software Installation

### Step 1: Install Node.js 18+

#### Ubuntu/Debian:
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### CentOS/RHEL:
```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install PostgreSQL 15+

#### Ubuntu/Debian:
```bash
# Add PostgreSQL repository
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Update package lists
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL:
```bash
# Install PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL
sudo dnf install -y postgresql15-server postgresql15 postgresql15-contrib

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15
```

### Step 3: Install Redis 7+

#### Ubuntu/Debian:
```bash
# Install Redis
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli ping
```

#### CentOS/RHEL:
```bash
# Install Redis
sudo dnf install -y redis

# Start and enable Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verify installation
redis-cli ping
```

### Step 4: Install Nginx

#### Ubuntu/Debian:
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

#### CentOS/RHEL:
```bash
# Install Nginx
sudo dnf install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 5: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup

# Follow the output command (example):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sfapp --hp /home/sfapp

# Save PM2 configuration
pm2 save
```

### Step 6: Install Additional Tools

```bash
# Install build tools (for native modules)
sudo apt install -y build-essential python3-dev  # Ubuntu/Debian
# OR
sudo dnf groupinstall -y "Development Tools"     # CentOS/RHEL

# Install Git (if not already installed)
sudo apt install -y git  # Ubuntu/Debian
# OR
sudo dnf install -y git  # CentOS/RHEL

# Install Certbot (for SSL certificates)
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu/Debian
# OR
sudo dnf install -y certbot python3-certbot-nginx  # CentOS/RHEL
```

---

## 🗄️ Database Setup

### Step 1: Configure PostgreSQL

#### Create Database and User:
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE sfapi;
CREATE USER sfuser WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sfapi TO sfuser;
ALTER DATABASE sfapi OWNER TO sfuser;
ALTER USER sfuser CREATEDB;
\q
```

#### Configure PostgreSQL for High Volume:
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf  # Ubuntu/Debian
# OR
sudo nano /var/lib/pgsql/15/data/postgresql.conf   # CentOS/RHEL
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
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

#### Configure PostgreSQL Access:
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf  # Ubuntu/Debian
# OR
sudo nano /var/lib/pgsql/15/data/pg_hba.conf   # CentOS/RHEL
```

**Add this line for local connections:**
```conf
# Local connections
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

#### Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Step 2: Configure Redis

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf  # Ubuntu/Debian
# OR
sudo nano /etc/redis.conf        # CentOS/RHEL
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

# Security
requirepass your_redis_password_here
bind 127.0.0.1
```

**Restart Redis:**
```bash
sudo systemctl restart redis-server  # Ubuntu/Debian
# OR
sudo systemctl restart redis         # CentOS/RHEL
```

---

## 🚀 Application Deployment

### Step 1: Deploy Application Code

```bash
# Switch to application user
sudo su - sfapp

# Navigate to application directory
cd /opt/sf-middleware

# Clone repository (replace with your actual repository URL)
git clone https://github.com/your-username/sf-middleware.git .

# Install dependencies
npm install

# Build application
npm run build

# Generate Prisma client
npx prisma generate
```

### Step 2: Create Environment Configuration

```bash
# Create environment file
nano .env
```

**Add all required environment variables:**
```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://sfuser:your_secure_password_here@localhost:5432/sfapi

# Redis
REDIS_URL=redis://:your_redis_password_here@localhost:6379

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

# Monitoring
ENABLE_TELEMETRY=true
LOG_LEVEL=info
```

### Step 3: Run Database Migrations

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Create high-volume indexes
psql -U sfuser -d sfapi -f scripts/create-indexes.sql
```

### Step 4: Create PM2 Configuration

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**Content:**
```javascript
module.exports = {
  apps: [
    // Main Application
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
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
    
    // Background Worker 1 - Salesforce
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

### Step 5: Create Logs Directory and Start Application

```bash
# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs
```

---

## 🌐 Web Server Configuration

### Step 1: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/sf-middleware  # Ubuntu/Debian
# OR
sudo nano /etc/nginx/conf.d/sf-middleware.conf     # CentOS/RHEL
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

### Step 2: Enable Site and Test Configuration

#### Ubuntu/Debian:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sf-middleware /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### CentOS/RHEL:
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 3: Setup SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🔒 Security Hardening

### Step 1: Configure SSH Security

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config
```

**Modify these settings:**
```conf
# Disable root login
PermitRootLogin no

# Disable password authentication (use SSH keys)
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional)
Port 2222

# Disable X11 forwarding
X11Forwarding no

# Limit users
AllowUsers sfapp admin
```

**Restart SSH:**
```bash
sudo systemctl restart ssh
```

### Step 2: Install and Configure Fail2ban

```bash
# Install Fail2ban
sudo apt install -y fail2ban  # Ubuntu/Debian
# OR
sudo dnf install -y fail2ban  # CentOS/RHEL

# Create configuration
sudo nano /etc/fail2ban/jail.local
```

**Content:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

**Start Fail2ban:**
```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Step 3: Configure Automatic Security Updates

#### Ubuntu/Debian:
```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

**Enable security updates:**
```conf
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
```

#### CentOS/RHEL:
```bash
# Install dnf-automatic
sudo dnf install -y dnf-automatic

# Enable automatic updates
sudo systemctl enable dnf-automatic.timer
sudo systemctl start dnf-automatic.timer
```

### Step 4: Configure Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Deny all other traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

---

## 📊 Monitoring & Logging

### Step 1: Setup Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/sf-middleware
```

**Content:**
```conf
/opt/sf-middleware/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sfapp sfapp
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Step 2: Install and Configure Monitoring Tools

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs  # Ubuntu/Debian
# OR
sudo dnf install -y htop iotop nethogs  # CentOS/RHEL

# Install Prometheus Node Exporter (optional)
wget https://github.com/prometheus/node_exporter/releases/latest/download/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

**Node Exporter service content:**
```ini
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

**Start Node Exporter:**
```bash
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### Step 3: Setup Health Check Scripts

```bash
# Create health check script
sudo nano /usr/local/bin/sf-health-check.sh
```

**Content:**
```bash
#!/bin/bash

# Health check script for SF Middleware
LOG_FILE="/var/log/sf-health-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if application is running
if ! pm2 list | grep -q "sf-middleware-app.*online"; then
    echo "[$DATE] ERROR: Application is not running" >> $LOG_FILE
    pm2 restart sf-middleware-app
    exit 1
fi

# Check if database is accessible
if ! psql -U sfuser -d sfapi -c "SELECT 1;" > /dev/null 2>&1; then
    echo "[$DATE] ERROR: Database is not accessible" >> $LOG_FILE
    exit 1
fi

# Check if Redis is accessible
if ! redis-cli ping > /dev/null 2>&1; then
    echo "[$DATE] ERROR: Redis is not accessible" >> $LOG_FILE
    exit 1
fi

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "[$DATE] ERROR: Nginx is not running" >> $LOG_FILE
    systemctl restart nginx
    exit 1
fi

echo "[$DATE] INFO: All services are healthy" >> $LOG_FILE
exit 0
```

**Make executable and setup cron:**
```bash
sudo chmod +x /usr/local/bin/sf-health-check.sh

# Add to crontab (check every 5 minutes)
echo "*/5 * * * * /usr/local/bin/sf-health-check.sh" | sudo crontab -
```

---

## ⚡ Performance Optimization

### Step 1: Kernel Parameters Optimization

```bash
# Edit sysctl configuration
sudo nano /etc/sysctl.conf
```

**Add these optimizations:**
```conf
# Network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# File descriptor limits
fs.file-max = 2097152
fs.nr_open = 2097152

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
```

**Apply changes:**
```bash
sudo sysctl -p
```

### Step 2: Configure System Limits

```bash
# Edit limits configuration
sudo nano /etc/security/limits.conf
```

**Add these limits:**
```conf
# Application user limits
sfapp soft nofile 65536
sfapp hard nofile 65536
sfapp soft nproc 32768
sfapp hard nproc 32768

# PostgreSQL limits
postgres soft nofile 65536
postgres hard nofile 65536
postgres soft nproc 32768
postgres hard nproc 32768
```

### Step 3: Database Performance Tuning

```bash
# Create database optimization script
sudo nano /usr/local/bin/db-optimize.sh
```

**Content:**
```bash
#!/bin/bash

# Database optimization script
echo "Starting database optimization..."

# Vacuum and analyze
psql -U sfuser -d sfapi -c "VACUUM ANALYZE;"

# Update statistics
psql -U sfuser -d sfapi -c "ANALYZE;"

# Check for long-running queries
psql -U sfuser -d sfapi -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

echo "Database optimization completed."
```

**Make executable and schedule:**
```bash
sudo chmod +x /usr/local/bin/db-optimize.sh

# Schedule to run daily at 2 AM
echo "0 2 * * * /usr/local/bin/db-optimize.sh" | sudo crontab -
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

```bash
# Check PM2 logs
pm2 logs sf-middleware-app --lines 50

# Check if port is in use
sudo netstat -tulpn | grep :3000

# Restart PM2
pm2 restart all

# Check environment variables
pm2 show sf-middleware-app
```

#### 2. Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log  # Ubuntu/Debian
# OR
sudo tail -f /var/lib/pgsql/15/data/log/postgresql-*.log  # CentOS/RHEL

# Test connection
psql -U sfuser -d sfapi -c "SELECT 1;"

# Check database size
psql -U sfuser -d sfapi -c "SELECT pg_size_pretty(pg_database_size('sfapi'));"
```

#### 3. Redis Connection Issues

```bash
# Check Redis status
sudo systemctl status redis-server  # Ubuntu/Debian
# OR
sudo systemctl status redis         # CentOS/RHEL

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Test Redis connection
redis-cli ping

# Check Redis memory usage
redis-cli info memory
```

#### 4. High Memory Usage

```bash
# Check memory usage
free -h
htop

# Check PM2 memory usage
pm2 monit

# Restart if needed
pm2 restart sf-middleware-app

# Check for memory leaks
pm2 logs sf-middleware-app | grep -i "memory\|leak"
```

#### 5. High CPU Usage

```bash
# Check CPU usage
top
htop

# Check specific processes
ps aux | grep node

# Check system load
uptime

# Restart workers if needed
pm2 restart sf-worker-salesforce
```

#### 6. Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Reload Nginx
sudo systemctl reload nginx
```

### Performance Monitoring Commands

```bash
# System overview
htop

# Memory usage
free -h

# Disk usage
df -h

# Network connections
netstat -tulpn | grep :3000

# Process tree
pstree -p

# System load
uptime

# Check open files
lsof | wc -l

# Check system limits
ulimit -a
```

---

## 🔄 Maintenance

### Daily Maintenance Tasks

```bash
# Check application health
pm2 status
pm2 logs --lines 20

# Check system resources
htop
df -h

# Check error logs
tail -f /opt/sf-middleware/logs/app-error.log
```

### Weekly Maintenance Tasks

```bash
# Database maintenance
/usr/local/bin/db-optimize.sh

# Check disk space
df -h
du -sh /opt/sf-middleware/logs/*

# Review system logs
sudo journalctl --since "1 week ago" | grep -i error

# Check security updates
sudo apt list --upgradable  # Ubuntu/Debian
# OR
sudo dnf check-update        # CentOS/RHEL
```

### Monthly Maintenance Tasks

```bash
# Full system update
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# OR
sudo dnf update -y                      # CentOS/RHEL

# Review and clean logs
sudo logrotate -f /etc/logrotate.d/sf-middleware

# Check SSL certificate expiration
sudo certbot certificates

# Review security logs
sudo fail2ban-client status
```

### Backup Procedures

```bash
# Create backup script
sudo nano /usr/local/bin/sf-backup.sh
```

**Backup script content:**
```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/sf-middleware"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U sfuser -d sfapi > $BACKUP_DIR/database_$DATE.sql

# Backup application code
tar -czf $BACKUP_DIR/application_$DATE.tar.gz /opt/sf-middleware --exclude=node_modules --exclude=logs

# Backup configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/nginx/sites-available/sf-middleware /opt/sf-middleware/.env

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Schedule backup:**
```bash
sudo chmod +x /usr/local/bin/sf-backup.sh

# Schedule daily backup at 3 AM
echo "0 3 * * * /usr/local/bin/sf-backup.sh" | sudo crontab -
```

---

## 📈 Performance Benchmarks

### Expected Performance Metrics

With this setup, you should achieve:

- ✅ **450,000+ jobs/day** sustained capacity
- ✅ **<2 second** average processing time
- ✅ **<1%** error rate
- ✅ **<100 jobs** queue depth under normal load
- ✅ **99.9%** uptime
- ✅ **<500ms** API response time
- ✅ **<50ms** database query time

### Monitoring Commands

```bash
# Check queue status
curl https://api.yourdomain.com/queue/monitor/health

# Check detailed metrics
curl https://api.yourdomain.com/queue/monitor/detailed

# Check application health
curl https://api.yourdomain.com/health

# Monitor system resources
pm2 monit
```

---

## 🆘 Emergency Procedures

### Application Recovery

```bash
# Stop all processes
pm2 stop all

# Clear Redis queues (if needed)
redis-cli FLUSHALL

# Restart application
pm2 start ecosystem.config.js

# Check status
pm2 status
```

### Database Recovery

```bash
# Stop application
pm2 stop all

# Restore from backup
psql -U sfuser -d sfapi < /opt/backups/sf-middleware/database_YYYYMMDD_HHMMSS.sql

# Start application
pm2 start ecosystem.config.js
```

### Complete System Recovery

```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx
sudo systemctl stop postgresql
sudo systemctl stop redis-server

# Restore from backup
sudo systemctl start postgresql
psql -U sfuser -d sfapi < /opt/backups/sf-middleware/database_YYYYMMDD_HHMMSS.sql
sudo systemctl start redis-server
sudo systemctl start nginx
pm2 start ecosystem.config.js
```

---

## 📚 Useful Commands Reference

### Application Management
```bash
# PM2 commands
pm2 status
pm2 logs
pm2 restart all
pm2 stop all
pm2 delete all
pm2 monit

# Application logs
tail -f /opt/sf-middleware/logs/app-error.log
tail -f /opt/sf-middleware/logs/app-out.log
```

### Database Management
```bash
# PostgreSQL commands
sudo systemctl status postgresql
sudo systemctl restart postgresql
psql -U sfuser -d sfapi
\dt  # List tables
\q   # Quit

# Database maintenance
psql -U sfuser -d sfapi -c "VACUUM ANALYZE;"
psql -U sfuser -d sfapi -c "SELECT pg_size_pretty(pg_database_size('sfapi'));"
```

### Redis Management
```bash
# Redis commands
sudo systemctl status redis-server
sudo systemctl restart redis-server
redis-cli
ping
INFO
MONITOR
```

### System Monitoring
```bash
# System commands
htop
df -h
free -h
uptime
netstat -tulpn
```

---

## 📝 Configuration Files Summary

| File | Location | Purpose |
|------|----------|---------|
| Application | `/opt/sf-middleware/` | Main application directory |
| Environment | `/opt/sf-middleware/.env` | Environment variables |
| PM2 Config | `/opt/sf-middleware/ecosystem.config.js` | Process manager configuration |
| Nginx Config | `/etc/nginx/sites-available/sf-middleware` | Web server configuration |
| PostgreSQL Config | `/etc/postgresql/15/main/postgresql.conf` | Database configuration |
| Redis Config | `/etc/redis/redis.conf` | Cache configuration |
| Logs | `/opt/sf-middleware/logs/` | Application logs |
| Backups | `/opt/backups/sf-middleware/` | Backup storage |

---

**Last Updated:** November 8, 2025

**Next Steps:** After completing this setup, refer to the [API Documentation](API_DOCUMENTATION.md) for endpoint usage and the [High Volume Setup Guide](HIGH_VOLUME_SETUP.md) for scaling beyond 450k jobs/day.
