// ecosystem.config.js
module.exports = {
    apps: [
      {
        name: 'sf-middleware',
        script: '/home/unicef/sf-middleware/dist/src/main.js',
        interpreter: '/opt/cpanel/ea-nodejs22/bin/node',
        cwd: '/home/unicef/sf-middleware',
        instances: 1,
        exec_mode: 'fork',
        env: {
          NODE_ENV: 'production',
          PORT: '3000',
          // Optional: raise heap limit if needed
          // NODE_OPTIONS: '--max-old-space-size=2048',
          NODE_OPTIONS: '--max-old-space-size=4096 --expose-gc',
        },
        env_file: '/home/unicef/sf-middleware/.env',
        error_file: '/home/unicef/sf-middleware/logs/prod-error.log',
        out_file:   '/home/unicef/sf-middleware/logs/prod-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        // max_memory_restart: '2G',
        max_memory_restart: '5G',
        watch: false,
        ignore_watch: ['node_modules', 'logs'],
        min_uptime: '10s',
        max_restarts: 10,
        restart_delay: 4000,
        exp_backoff_restart_delay: 2000
      },
    ],
  };