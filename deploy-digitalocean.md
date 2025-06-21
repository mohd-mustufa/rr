# Digital Ocean Deployment Guide

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

# Or if using a different user
ssh username@YOUR_DROPLET_IP
```

## Step 3: Update System and Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for potential direct deployment)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Start and enable services
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 4: Clone Your Repository

```bash
# Create app directory
mkdir -p /var/www/painting-generator
cd /var/www/painting-generator

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/painting-generator.git .

# Or if you need to upload files manually
# Use scp or SFTP to upload your project files
```

## Step 5: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add your environment variables:

```env
# Database
DB_PASSWORD=your_secure_password_here
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

## Step 6: Configure Docker for Production

Create a production docker-compose file:

```bash
# Create production compose file
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: painting-generator-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql-init:/docker-entrypoint-initdb.d
    networks:
      - painting-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  # Node.js Application
  app:
    build: .
    container_name: painting-generator-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=mysql
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - SERVER_IP=${SERVER_IP}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - painting-network

volumes:
  mysql_data:
    driver: local

networks:
  painting-network:
    driver: bridge
```

## Step 7: Configure Nginx as Reverse Proxy

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

## Step 8: Deploy the Application

```bash
# Navigate to project directory
cd /var/www/painting-generator

# Build and start containers
docker-compose -f docker-compose.prod.yml up --build -d

# Check if containers are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Step 9: Configure SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your_domain.com -d www.your_domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 10: Set Up Firewall

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

## Step 11: Set Up Monitoring and Logs

```bash
# Create log directory
mkdir -p /var/www/painting-generator/logs

# Set up log rotation
sudo nano /etc/logrotate.d/painting-generator
```

Add this content:

```
/var/www/painting-generator/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## Step 12: Create Deployment Script

```bash
# Create deployment script
nano deploy.sh
```

```bash
#!/bin/bash

echo "Starting deployment..."

# Pull latest changes
git pull origin main

# Build and restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d

# Check status
docker-compose -f docker-compose.prod.yml ps

echo "Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

## Step 13: Set Up Automatic Backups

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
docker exec painting-generator-mysql mysqldump -u root -p${DB_PASSWORD} painting_generator > $BACKUP_DIR/db_backup_$DATE.sql

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
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View application logs
docker-compose -f docker-compose.prod.yml logs app

# View database logs
docker-compose -f docker-compose.prod.yml logs mysql

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Common Issues

1. **Port 3000 not accessible**: Check if containers are running and firewall settings
2. **Database connection issues**: Verify environment variables and container networking
3. **File upload issues**: Check uploads directory permissions
4. **SSL issues**: Verify domain DNS settings and Certbot configuration

### Performance Optimization

1. **Enable Nginx caching** for static assets
2. **Configure MySQL optimization** for your workload
3. **Set up monitoring** with tools like htop, netdata, or Prometheus
4. **Consider using a CDN** for global performance

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Strong passwords for database and JWT
- [ ] SSL certificate installed
- [ ] Regular security updates enabled
- [ ] Database backups configured
- [ ] Log monitoring set up
- [ ] Rate limiting configured (optional)

## Cost Optimization

- **Droplet Size**: Start with 2GB RAM, scale up as needed
- **Backup Storage**: Use Digital Ocean Spaces for cheaper storage
- **CDN**: Consider Cloudflare for free CDN services
- **Monitoring**: Use free monitoring tools initially

Your application should now be accessible at `http://your_domain.com` or `https://your_domain.com` if SSL is configured! 