// Development PM2 Configuration
// Note: Workers (BullMQ processors) run automatically within the NestJS app
// No separate worker processes needed - the app handles both REST API and job processing
module.exports = {
  apps: [
    // Main Application (handles both REST API and queue workers)
    // Workers process jobs automatically when the app starts via BullMQ processors
    {
      name: 'sf-middleware-dev',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_file: '.env',
      error_file: './logs/dev-error.log',
      out_file: './logs/dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
};
