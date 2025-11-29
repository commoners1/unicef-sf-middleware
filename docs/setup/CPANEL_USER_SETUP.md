# cPanel Setup Guide (Without Root Access)

This guide is for cPanel users who **don't have root access** and cannot use `/opt/` directory.

## ✅ Prerequisites

### Required Software

| Software | Minimum Version | Installation Status |
|----------|----------------|---------------------|
| **Node.js** | 18+ | We'll install (via cPanel Node.js Selector or request from host) |
| **PostgreSQL** | 15+ | We'll install (may need to request from hosting provider) |
| **Redis** | 7+ | We'll install (may need to request from hosting provider) |
| **PM2** | Latest | We'll install (via npm or request from hosting provider) |
| **Nginx** | Latest | Typically pre-installed (but may not have direct access) |

### System Requirements

- **RAM**: 16GB (8GB minimum)
- **CPU**: 8 cores (4 minimum)
- **Storage**: 100GB+ SSD
- **OS**: CentOS/CloudLinux with cPanel

### Access Requirements

- **SSH Access**: Required (usually available in cPanel)
- **cPanel Account**: With application deployment permissions
- **Node.js Support**: Via cPanel Node.js Selector or hosting provider setup

**Important:** Some hosting providers may not offer PostgreSQL or Redis. In such cases, you may need to:
- Request these services from your hosting provider
- Use external managed services (e.g., managed PostgreSQL/Redis from cloud providers)
- Consider upgrading to a VPS/dedicated server for full control

## 📂 Recommended Directory Structure

For cPanel accounts, use your home directory (`~/`) instead of `/opt/`:

```
/home/your-cpanel-username/
├── sf-middleware/              # API Backend
│   ├── dist/                   # Built application
│   ├── logs/                   # Application logs
│   ├── .env                    # Environment variables
│   ├── ecosystem.config.js     # PM2 configuration
│   └── ...                     # Source code
├── sf-dashboard/               # Dashboard build directory
│   ├── dist/                   # Built dashboard files
│   └── ...
└── public_html/               # Web-accessible files
    └── yourdomain.com/        # Dashboard files go here
        └── index.html
```

## 🚀 Step-by-Step Setup

### Step 1: Access Your Home Directory

```bash
# Connect via SSH (cPanel usually provides SSH access)
# Your home directory is typically: /home/your-username

cd ~
pwd  # Should show /home/your-username
```

### Step 2: Create Application Directory

```bash
# Create directories in your home directory
mkdir -p ~/sf-middleware
mkdir -p ~/sf-dashboard
mkdir -p ~/sf-middleware/logs

cd ~/sf-middleware
```

### Step 3: Upload/Clone Your Code

You have several options:

**Option A: Via Git (if available)**
```bash
cd ~/sf-middleware
git clone https://your-repo/sf-project.git temp
mv temp/sf-middleware/* .
rm -rf temp
```

**Option B: Via cPanel File Manager**
1. Open cPanel File Manager
2. Navigate to your home directory
3. Upload and extract your `sf-middleware` files to `~/sf-middleware/`

**Option C: Via SFTP/SCP**
```bash
# From your local machine
scp -r sf-middleware/* your-username@your-server.com:~/sf-middleware/
```

### Step 4: Install Dependencies

```bash
cd ~/sf-middleware

# Check Node.js version (should be 18+)
node --version

# If Node.js is not available, install via cPanel:
# 1. Go to cPanel → Software → Node.js Selector
# 2. Install Node.js 18 or higher
# 3. Create application and set Node.js version

# Use npm ci for production deployments (faster and more reliable)
# This requires package-lock.json to exist
npm ci
npm run build
npx prisma generate
```

**Note:** `npm ci` is preferred over `npm install` because:
- ✅ Faster installation (uses exact versions from package-lock.json)
- ✅ More reliable (removes node_modules and does a clean install)
- ✅ Deterministic (ensures exact dependency versions)
- ✅ Fails if package-lock.json is out of sync (prevents inconsistencies)

If `package-lock.json` doesn't exist, you can generate it first:
```bash
npm install  # Creates package-lock.json
# Then use npm ci for future deployments
```

### Step 5: Setup Database

In cPanel, databases are typically managed via the UI:

1. **Create Database via cPanel:**
   - Go to cPanel → MySQL Databases
   - Create a new database (e.g., `username_sfapi`)
   - Create a database user
   - Grant all privileges to the user on the database
   - Note the database connection details

2. **Get Database Connection Info:**
   - Database host: Usually `localhost` or `127.0.0.1`
   - Database name: `username_sfapi`
   - Username: `username_dbuser`
   - Password: (the one you set)

3. **Run Migrations:**
```bash
cd ~/sf-middleware

# Update .env with your database connection
# DATABASE_URL=postgresql://username:password@localhost:5432/username_sfapi

npx prisma migrate deploy
```

### Step 6: Create Environment File

```bash
cd ~/sf-middleware
nano .env
```

**Environment Variables:**
```env
# Application
NODE_ENV=production
PORT=3000

# Database (from cPanel MySQL Databases)
DATABASE_URL=postgresql://username:password@localhost:5432/username_sfapi

# Redis (if available - check with your hosting provider)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Salesforce API
SF_BASE_ENDPOINT=https://your-salesforce-endpoint.com
SF_CLIENT_ID=your-client-id
SF_CLIENT_SECRET=your-client-secret
SF_RESOURCE_API=your-resource-api-endpoint
SF_TOKEN_URL=https://your-token-endpoint.com
SF_SUBSCRIPTION_KEY=your-subscription-key
SF_SUBSCRIPTION_PAYMENT_KEY=your-payment-key

# Queue Configuration
QUEUE_NAME=sf-queue
SALESFORCE_CONCURRENCY=20
EMAIL_CONCURRENCY=20
NOTIFICATION_CONCURRENCY=20

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
HIGH_VOLUME_RATE_LIMIT=1000
RATE_LIMIT_MAX=500
```

### Step 7: Create PM2 Configuration

```bash
cd ~/sf-middleware
nano ecosystem.config.js
```

**Content:**
```javascript
module.exports = {
  apps: [
    {
      name: 'sf-middleware',
      script: './dist/main.js',
      instances: 1, // Adjust based on your hosting limits
      exec_mode: 'fork', // Use 'fork' if cluster mode not supported
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
  ],
};
```

### Step 8: Start Application with PM2

```bash
cd ~/sf-middleware

# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Check status
pm2 status

# View logs
pm2 logs sf-middleware
```

**Note:** Some cPanel hosts may restrict PM2. If PM2 is not available:
- Use cPanel's Application Manager
- Or contact your hosting provider to enable PM2/Node.js apps
- Or use `nohup` as a fallback (not recommended for production)

### Step 9: Setup Dashboard

```bash
# Navigate to dashboard directory
cd ~/sf-dashboard

# Upload/clone dashboard files here
# (similar to step 3)

# Install dependencies using npm ci (recommended for production)
npm ci

# Create production environment file
nano .env.production
```

**.env.production:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_APP_TITLE=SF Middleware Dashboard
```

```bash
# Build dashboard (with memory flags already in package.json)
npm run build

# Copy to public_html
mkdir -p ~/public_html/yourdomain.com
cp -r ~/sf-dashboard/dist/* ~/public_html/yourdomain.com/

# Set permissions (if needed)
chmod -R 755 ~/public_html/yourdomain.com
```

### Step 10: Configure Subdomain (Optional)

If you want a separate subdomain for the API:

1. **In cPanel:**
   - Go to Subdomains
   - Create subdomain: `api.yourdomain.com`
   - Document root: `~/public_html/api.yourdomain.com` (or similar)

2. **Create Reverse Proxy:**
   - You may need to use `.htaccess` for Apache reverse proxy
   - Or contact your hosting provider for Nginx reverse proxy setup
   - Or use cPanel's Application Manager if it supports Node.js apps

## 🔧 Alternative: Using cPanel Application Manager

Many cPanel hosts provide an "Application Manager" that simplifies Node.js deployments:

1. **In cPanel:**
   - Go to Software → Node.js Selector
   - Click "Create Application"
   - Set:
     - Node.js version: 18+
     - Application root: `~/sf-middleware`
     - Application URL: Choose subdomain or subdirectory
     - Application startup file: `dist/main.js`
     - Application mode: Production
   - Add environment variables (from your `.env` file)

2. **The Application Manager will:**
   - Automatically start your app
   - Handle restarts
   - Provide a URL to access your API

## 📝 Important Notes

### Directory Paths

**Replace in all commands:**
- `/opt/sf-middleware` → `~/sf-middleware` or `/home/your-username/sf-middleware`
- `/opt/sf-dashboard` → `~/sf-dashboard` or `/home/your-username/sf-dashboard`

### Permissions

```bash
# Make sure you own the directories
chown -R $USER:$USER ~/sf-middleware
chown -R $USER:$USER ~/sf-dashboard

# Set proper permissions
chmod -R 755 ~/sf-middleware
chmod 600 ~/sf-middleware/.env  # Protect environment file
```

### Logs Location

```bash
# Logs will be in:
~/sf-middleware/logs/error.log
~/sf-middleware/logs/out.log

# Or check PM2 logs:
pm2 logs sf-middleware
```

### Redis

If Redis is not available:
- Contact your hosting provider
- Some hosts provide Redis through cPanel
- Or use an external Redis service (Redis Cloud, etc.)

### PostgreSQL vs MySQL

**Note:** The application uses PostgreSQL. If your cPanel only provides MySQL:
- Contact your hosting provider about PostgreSQL
- Or consider using a managed PostgreSQL service
- Or modify the application to use MySQL (requires code changes)

## 🛠️ Troubleshooting

### "Permission Denied" Errors

```bash
# Check ownership
ls -la ~/sf-middleware

# Fix ownership
chown -R $USER:$USER ~/sf-middleware

# Check file permissions
chmod +x ~/sf-middleware/dist/main.js
```

### PM2 Not Available

**Option 1: Use cPanel Application Manager** (recommended)
- Set up through cPanel UI as described above

**Option 2: Request PM2 from Host**
- Contact hosting provider to enable PM2

**Option 3: Use nohup (not recommended)**
```bash
cd ~/sf-middleware
nohup node dist/main.js > logs/out.log 2> logs/error.log &
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Change PORT in .env to an available port
# Then update your reverse proxy configuration
```

### Database Connection Issues

- Verify database credentials in cPanel
- Check if database host is `localhost` or `127.0.0.1`
- Some hosts use socket connections - check cPanel MySQL settings
- Verify database user has all privileges

## 🔄 Deployment Script (Using npm ci)

For regular updates, create a deployment script that uses `npm ci`:

**Create `~/sf-middleware/deploy.sh`:**
```bash
#!/bin/bash

# Set Node.js memory limit (handled by package.json, but can override)
export NODE_OPTIONS="--max-old-space-size=4096"

cd ~/sf-middleware

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing dependencies with npm ci..."
npm ci

echo "🔨 Building application..."
npm run build

echo "🗄️ Running database migrations..."
npx prisma migrate deploy
npx prisma generate

echo "🔄 Restarting application..."
pm2 restart sf-middleware || pm2 start ecosystem.config.js

echo "✅ Deployment complete!"
```

**Make it executable:**
```bash
chmod +x ~/sf-middleware/deploy.sh
```

**Then deploy with:**
```bash
~/sf-middleware/deploy.sh
```

**For dashboard deployment, create `~/sf-dashboard/deploy.sh`:**
```bash
#!/bin/bash

cd ~/sf-dashboard

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing dependencies with npm ci..."
npm ci

echo "🔨 Building dashboard..."
npm run build

echo "📁 Copying to public_html..."
cp -r dist/* ~/public_html/yourdomain.com/

echo "✅ Dashboard deployment complete!"
```

**Why `npm ci` over `npm install`?**
- ✅ **Faster**: Uses exact versions from `package-lock.json` (no resolution needed)
- ✅ **More reliable**: Removes `node_modules` and does a clean install
- ✅ **Deterministic**: Ensures exact dependency versions match your lock file
- ✅ **Fails fast**: Errors if `package-lock.json` is out of sync (prevents bugs)
- ✅ **Production-ready**: Same approach used in Docker builds

**Note:** Always commit `package-lock.json` to your repository for `npm ci` to work.

## 📞 Support

If you encounter issues:
1. Check application logs: `~/sf-middleware/logs/`
2. Check cPanel error logs
3. Verify all environment variables are set correctly
4. Contact your hosting provider for Node.js/PM2 support

## 🎉 Summary

**Key Differences from Root Setup:**
- ✅ Use `~/` (home directory) instead of `/opt/`
- ✅ Use cPanel MySQL instead of standalone PostgreSQL (may need adjustment)
- ✅ Use cPanel Application Manager if available
- ✅ Contact hosting provider for Redis/PM2 if not available
- ✅ Set proper file permissions in home directory

**Directory Structure:**
```
~/sf-middleware/          ← Application code
~/sf-dashboard/           ← Dashboard build
~/public_html/domain.com/ ← Dashboard files for web
~/sf-middleware/logs/     ← Application logs
```

