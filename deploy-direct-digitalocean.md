# Direct Digital Ocean Deployment Guide

## Step 1: Create a Digital Ocean Droplet

1. **Log into Digital Ocean** and click "Create" → "Droplets"

2. **Choose Configuration:**
   - **Distribution**: Ubuntu 22.04 LTS
   - **Plan**: Basic
   - **Size**: 
     - **Minimum**: 2GB RAM, 1 vCPU, 50GB SSD ($12/month)
     - **Recommended**: 4GB RAM, 2 vCPU, 80GB SSD ($24/month)
   - **Datacenter**: Choose closest to your users

3. **Authentication:**
   - Add your SSH key or create a password
   - **Recommended**: Use SSH key for security

4. **Finalize:**
   - Choose a hostname (e.g., `painting-generator`)
   - Click "Create Droplet"

## Step 2: Connect to Your Droplet

```bash
# Connect via SSH (replace with your droplet's IP)
ssh root@YOUR_DROPLET_IP
```

## Step 3: Update System and Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install build tools
sudo apt install -y build-essential

# Start and enable services
sudo systemctl start mysql
sudo systemctl enable mysql
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 4: Configure MySQL

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

In MySQL, run:
```sql
CREATE DATABASE painting_generator;
CREATE USER 'painting_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON painting_generator.* TO 'painting_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 5: Clone Your Repository

```bash
# Create app directory
mkdir -p /var/www/painting-generator
cd /var/www/painting-generator

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/painting-generator.git .

# Switch to your fix/bugs branch
git checkout fix/bugs
```

## Step 6: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add your environment variables:

```env
# Database
DB_HOST=localhost
DB_USER=painting_user
DB_PASSWORD=your_secure_password
DB_NAME=painting_generator

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key
OPENAI_API_KEY=your_openai_api_key

# JWT Secret
JWT_SECRET=your_very_long_random_jwt_secret_key

# Server Configuration
SERVER_IP=your_droplet_ip_or_domain
NODE_ENV=production
PORT=3000
```

## Step 7: Install Dependencies and Build

```bash
# Install Node.js dependencies
npm install

# Create necessary directories
mkdir -p uploads logs

# Set proper permissions
sudo chown -R $USER:$USER /var/www/painting-generator
chmod -R 755 /var/www/painting-generator
```

## Step 8: Initialize Database

```bash
# Run database initialization
node migrate-db.js
```

## Step 9: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/painting-generator
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Client max body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Serve static files directly
    location /uploads/ {
        alias /var/www/painting-generator/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/painting-generator /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 10: Start the Application with PM2

```bash
# Navigate to project directory
cd /var/www/painting-generator

# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add this content:

```javascript
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
    time: true
  }]
};
```

Start the application:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 11: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

## Step 12: Configure SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your_domain.com -d www.your_domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 13: Create Deployment Script

```bash
# Create deployment script
nano deploy.sh
```

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/painting-generator

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin fix/bugs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Restart application
echo "🔄 Restarting application..."
pm2 restart painting-generator

# Check status
echo "📊 Checking status..."
pm2 status

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

## Step 14: Set Up Automatic Backups

```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/painting-generator"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u painting_user -p painting_generator > $BACKUP_DIR/db_backup_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and add to crontab:

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
# 0 2 * * * /var/www/painting-generator/backup.sh
```

## Troubleshooting

### Check Application Status
```bash
# Check PM2 status
pm2 status
pm2 logs painting-generator

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Common Issues

1. **Port 3000 not accessible**: Check if PM2 is running and firewall settings
2. **Database connection issues**: Verify MySQL is running and credentials
3. **File upload issues**: Check uploads directory permissions
4. **SSL issues**: Verify domain DNS settings and Certbot configuration

### Performance Optimization

1. **Enable Nginx caching** for static assets
2. **Configure MySQL optimization** for your workload
3. **Set up monitoring** with tools like htop or netdata
4. **Consider using a CDN** for global performance

## Quick Commands

```bash
# Restart application
pm2 restart painting-generator

# View logs
pm2 logs painting-generator

# Stop application
pm2 stop painting-generator

# Start application
pm2 start painting-generator

# Monitor resources
pm2 monit

# Deploy updates
./deploy.sh
```

Your application should now be accessible at `http://your_domain.com` or `https://your_domain.com` if SSL is configured! 