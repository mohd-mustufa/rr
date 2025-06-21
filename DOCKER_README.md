# AI Painting Generator - Docker Deployment Guide

This guide will help you deploy the AI Painting Generator application using Docker containers, ensuring it doesn't interfere with other projects on your system.

## 📋 Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (to clone the repository)

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd rr
   ```

2. **Run the automated setup script**:
   ```bash
   # For production environment
   ./docker-setup.sh
   
   # For development environment (with hot reloading)
   ./docker-setup.sh dev
   ```

3. **Configure your API keys**:
   Edit the `.env` file and add your actual API keys:
   ```bash
   nano .env
   ```

### Option 2: Manual Setup

1. **Create environment file**:
   ```bash
   cp README.md .env
   ```

2. **Edit the `.env` file** with your API keys:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=rootpassword
   DB_NAME=painting_generator
   OPENROUTER_API_KEY=your_actual_openrouter_api_key
   OPENAI_API_KEY=your_actual_openai_api_key
   JWT_SECRET=your_secure_jwt_secret
   SERVER_IP=localhost
   ```

3. **Start the containers**:
   ```bash
   # Production environment
   docker-compose up --build -d
   
   # Development environment
   docker-compose -f docker-compose.dev.yml up --build -d
   ```

## 🏗️ Architecture

The Docker setup includes:

- **Node.js Application Container**: Runs the main application
- **MySQL Database Container**: Stores all application data
- **Dedicated Network**: Isolates the application from other Docker networks
- **Persistent Volumes**: Ensures data persistence across container restarts

### Container Details

| Service | Container Name | Port | Purpose |
|---------|----------------|------|---------|
| App | `painting-generator-app` | 3000 | Main application |
| MySQL | `painting-generator-mysql` | 3306 | Database |

## 📁 Directory Structure

```
rr/
├── Dockerfile                 # Production container definition
├── Dockerfile.dev            # Development container definition
├── docker-compose.yml        # Production orchestration
├── docker-compose.dev.yml    # Development orchestration
├── .dockerignore             # Files to exclude from build
├── docker-setup.sh           # Automated setup script
├── uploads/                  # Generated images (persistent)
├── logs/                     # Application logs (persistent)
└── mysql-init/               # Database initialization scripts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 3000 |
| `DB_HOST` | Database host | mysql |
| `DB_USER` | Database user | painting_user |
| `DB_PASSWORD` | Database password | rootpassword |
| `DB_NAME` | Database name | painting_generator |
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `JWT_SECRET` | JWT signing secret | your_jwt_secret_key |
| `SERVER_IP` | Server IP address | localhost |

### Volumes

- **`mysql_data`**: Persistent MySQL data
- **`./uploads`**: Generated images
- **`./logs`**: Application logs

## 🛠️ Management Commands

### Start Services
```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up -d
```

### Stop Services
```bash
# Production
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mysql

# Development
docker-compose -f docker-compose.dev.yml logs -f
```

### Restart Services
```bash
# Production
docker-compose restart

# Development
docker-compose -f docker-compose.dev.yml restart
```

### Access Database
```bash
# Connect to MySQL
docker exec -it painting-generator-mysql mysql -u root -p

# Backup database
docker exec painting-generator-mysql mysqldump -u root -p painting_generator > backup.sql

# Restore database
docker exec -i painting-generator-mysql mysql -u root -p painting_generator < backup.sql
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## 🔍 Troubleshooting

### Common Issues

1. **Port 3000 already in use**:
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Change port in .env file
   PORT=3001
   ```

2. **Port 3306 already in use**:
   ```bash
   # Check what's using the port
   lsof -i :3306
   
   # Change port in docker-compose.yml
   ports:
     - "3307:3306"
   ```

3. **Container won't start**:
   ```bash
   # Check logs
   docker-compose logs app
   
   # Check container status
   docker-compose ps
   ```

4. **Database connection issues**:
   ```bash
   # Check if MySQL is running
   docker exec painting-generator-mysql mysqladmin ping -h localhost
   
   # Check MySQL logs
   docker-compose logs mysql
   ```

### Health Checks

The containers include health checks to ensure services are running properly:

```bash
# Check health status
docker-compose ps

# Manual health check
curl http://localhost:3000/api/config
```

## 🧹 Cleanup

### Remove Everything
```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove images
docker rmi painting-generator-app
docker rmi mysql:8.0
```

### Keep Data
```bash
# Stop containers but keep volumes
docker-compose down

# Remove only containers and networks
docker-compose down --remove-orphans
```

## 🔒 Security Considerations

- The application runs as a non-root user inside containers
- Database passwords should be changed from defaults
- API keys should be kept secure and not committed to version control
- The `.env` file is excluded from Docker builds

## 📊 Monitoring

### Resource Usage
```bash
# Check container resource usage
docker stats

# Check disk usage
docker system df
```

### Application Status
```bash
# Check if application is responding
curl http://localhost:3000/api/config

# Check database connectivity
docker exec painting-generator-mysql mysqladmin ping -h localhost
```

## 🚀 Production Deployment

For production deployment, consider:

1. **Use a reverse proxy** (nginx, traefik)
2. **Set up SSL certificates**
3. **Configure proper logging**
4. **Set up monitoring and alerting**
5. **Use external database service**
6. **Configure backup strategies**

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure Docker and Docker Compose are up to date
4. Check if ports are available
5. Verify API keys are valid

---

**Note**: This Docker setup ensures complete isolation from other projects on your system. Each project runs in its own containers with dedicated networks and volumes. 