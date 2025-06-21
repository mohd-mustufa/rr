#!/bin/bash

echo "🚀 Starting deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your environment variables."
    exit 1
fi

# Pull latest changes (if using git)
if [ -d .git ]; then
    echo "📥 Pulling latest changes..."
    git pull origin main
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Remove old images to save space
echo "🧹 Cleaning up old images..."
docker image prune -f

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for containers to be healthy
echo "⏳ Waiting for containers to be ready..."
sleep 30

# Check container status
echo "📊 Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# Check if containers are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo "🌐 Your application should be accessible at:"
    echo "   http://$(hostname -I | awk '{print $1}'):3000"
    echo "   or your domain if configured"
else
    echo "❌ Deployment failed! Check logs:"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

echo "📝 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "🎉 Deployment complete!" 