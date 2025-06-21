#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cat > .env << EOF
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=painting_generator
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_jwt_secret_key_here
SERVER_IP=localhost
EOF
        print_warning "Please edit .env file with your actual API keys before starting the application."
    else
        print_success ".env file found"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p uploads logs mysql-init
    print_success "Directories created"
}

# Build and start containers
start_containers() {
    local mode=$1
    
    if [ "$mode" = "dev" ]; then
        print_status "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up --build -d
    else
        print_status "Starting production environment..."
        docker-compose up --build -d
    fi
    
    print_success "Containers started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for MySQL
    print_status "Waiting for MySQL to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker exec painting-generator-mysql mysqladmin ping -h localhost --silent; then
            print_success "MySQL is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "MySQL failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for Node.js app
    print_status "Waiting for Node.js application to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000/api/config > /dev/null 2>&1; then
            print_success "Node.js application is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Node.js application failed to start within 60 seconds"
        exit 1
    fi
}

# Show status
show_status() {
    print_status "Container status:"
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml ps
    else
        docker-compose ps
    fi
    
    echo ""
    print_success "Application is running at: http://localhost:3000"
    print_status "MySQL is accessible at: localhost:3306"
}

# Main function
main() {
    local mode=${1:-prod}
    
    echo "=========================================="
    echo "  AI Painting Generator Docker Setup"
    echo "=========================================="
    echo ""
    
    check_docker
    check_env_file
    create_directories
    start_containers $mode
    wait_for_services
    show_status $mode
    
    echo ""
    print_success "Setup completed successfully!"
    echo ""
    print_status "Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop containers: docker-compose down"
    echo "  - Restart containers: docker-compose restart"
    echo "  - Access MySQL: docker exec -it painting-generator-mysql mysql -u root -p"
}

# Handle command line arguments
case "${1:-}" in
    "dev")
        main "dev"
        ;;
    "prod"|"")
        main "prod"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [dev|prod|help]"
        echo "  dev  - Start development environment with hot reloading"
        echo "  prod - Start production environment (default)"
        echo "  help - Show this help message"
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac 