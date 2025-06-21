module.exports = {
  apps: [{
    name: 'painting-generator',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on file changes (optional)
    watch: ['server.js', 'controllers/', 'routes/', 'middleware/'],
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}; 