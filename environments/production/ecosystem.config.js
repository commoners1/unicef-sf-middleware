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
      instances: 2,
      exec_mode: 'cluster',
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
