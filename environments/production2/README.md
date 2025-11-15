# Production Environment

This directory contains the production environment configuration optimized for high volume (450k+ jobs/day).

## Quick Start

### Using Docker (Recommended)

```bash
# Start production environment
cd environments/production2
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale workers
docker-compose up -d --scale workers=5
```

### Using PM2 (cPanel/WHM)

```bash
# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor
pm2 monit
```

## Environment Details

- **Port**: 3000
- **URL**: https://api.yourdomain.com
- **Database**: PostgreSQL (optimized for high volume)
- **Redis**: Redis cluster (3 nodes for high availability)
- **Monitoring**: Prometheus on port 9090

## High Volume Configuration

### Application Scaling
- **Main App**: 1 instance (fork mode) - configured via ecosystem.config.js
- **Salesforce Workers**: Handled by BullMQ queue processors
- **Email Workers**: Handled by BullMQ queue processors
- **Notification Workers**: Handled by BullMQ queue processors

**Note**: The production environment uses PM2 with fork mode and a single instance. Workers are processed by the main application using BullMQ queues.

### Database Optimization
- **Connection Pool**: 200 max connections
- **Shared Buffers**: 256MB
- **Work Memory**: 4MB
- **Autovacuum**: Optimized for high volume

### Redis Optimization
- **Memory**: 1GB per node
- **Policy**: allkeys-lru
- **Persistence**: AOF enabled
- **Cluster**: 3 nodes for redundancy

## Environment Variables

The production environment uses `.env` file with the following key settings:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://sfuser_prod:password@localhost:5432/sfapi_production`
- `REDIS_URL=redis://localhost:6379/0`
- Salesforce endpoints point to production environment
- High rate limiting for production load

## Performance Expectations

With this configuration, you should achieve:

- ✅ **450,000+ jobs/day** sustained capacity
- ✅ **<2 second** average processing time
- ✅ **<1%** error rate
- ✅ **<100 jobs** queue depth under normal load
- ✅ **99.9%** uptime

## Monitoring

### Health Checks

```bash
# Application health
curl https://api.yourdomain.com/health

# Queue health
curl https://api.yourdomain.com/queue/monitor/health

# Detailed metrics
curl https://api.yourdomain.com/queue/monitor/detailed
```

### Prometheus Monitoring

```bash
# Access Prometheus
open http://yourdomain.com:9090

# Check metrics
curl http://yourdomain.com:9090/api/v1/query?query=up
```

### PM2 Monitoring

```bash
# Check status
pm2 status

# View logs
pm2 logs sf-middleware

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart sf-middleware
```

## Database Setup

### Create Production Database

```bash
# Create production database
psql -U postgres -c "CREATE USER sfuser_prod WITH PASSWORD 'production_password';"
psql -U postgres -c "CREATE DATABASE sfapi_production OWNER sfuser_prod;"

# Run migrations
npx prisma migrate deploy

# Create indexes
psql -U sfuser_prod -d sfapi_production -f scripts/create-indexes.sql
psql -U sfuser_prod -d sfapi_production -f scripts/database-optimizations.sql
```

### Database Monitoring

```bash
# Check database size
psql -U sfuser_prod -d sfapi_production -c "SELECT pg_size_pretty(pg_database_size('sfapi_production'));"

# Check active connections
psql -U sfuser_prod -d sfapi_production -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -U sfuser_prod -d sfapi_production -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## SSL Certificate Setup

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

## Load Balancing (Optional)

For even higher volume, consider using a load balancer:

```nginx
# Load balancer configuration
upstream sf_middleware_production {
    server 127.0.0.1:3000 weight=1;
    server 127.0.0.1:3001 weight=1;
    server 127.0.0.1:3002 weight=1;
    keepalive 64;
}
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U sfuser_prod -d sfapi_production > /backups/sfapi_production_$DATE.sql
gzip /backups/sfapi_production_$DATE.sql
# Keep only last 7 days
find /backups -name "sfapi_production_*.sql.gz" -mtime +7 -delete
EOF

chmod +x backup-db.sh

# Add to crontab
echo "0 2 * * * /path/to/backup-db.sh" | crontab -
```

### Application Backup

```bash
# Backup application
tar -czf /backups/sf-middleware-$(date +%Y%m%d).tar.gz /opt/sf-middleware/
```

## Troubleshooting

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart sf-middleware

# Check for memory leaks
pm2 logs sf-middleware --lines 100 | grep -i memory
```

### High CPU Usage

```bash
# Check CPU usage
top

# Check specific process
ps aux | grep node

# Restart workers if needed
pm2 restart sf-middleware
```

### Database Performance

```bash
# Check slow queries
psql -U sfuser_prod -d sfapi_production -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check table sizes
psql -U sfuser_prod -d sfapi_production -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Redis Performance

```bash
# Check Redis memory
redis-cli info memory

# Check Redis performance
redis-cli --latency

# Check queue lengths
redis-cli llen bull:salesforce:wait
redis-cli llen bull:email:wait
redis-cli llen bull:notifications:wait
```

## Security Checklist

- [ ] Change default database passwords
- [ ] Setup SSL certificates (HTTPS)
- [ ] Configure firewall rules
- [ ] Enable fail2ban for SSH
- [ ] Regular security updates
- [ ] Daily database backups
- [ ] Monitor logs for suspicious activity
- [ ] Use strong JWT secrets
- [ ] Implement rate limiting
- [ ] Restrict database access (localhost only)
- [ ] Enable Redis AUTH
- [ ] Regular security audits

## Maintenance Schedule

### Daily
- Check application health
- Monitor queue depth
- Review error logs
- Check disk space

### Weekly
- Database vacuum and analyze
- Review slow queries
- Check Redis memory usage
- Review system logs

### Monthly
- Security updates
- Performance review
- Backup verification
- Review system logs
- Update dependencies

---

**Last Updated:** 8 November 2025
