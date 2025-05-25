#!/bin/bash

# Professional Docker Management Script for Chatbot
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="chatbot"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_blue() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose is not installed."
        exit 1
    fi
}

# Setup environment
setup() {
    log_info "🔧 Setting up Chatbot environment..."
    
    # Create .env file if not exists
    if [[ ! -f .env ]]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warn "Please edit .env file with your actual values before deploying!"
        log_warn "Required: JWT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY"
    fi
    
    # Create necessary directories
    mkdir -p nginx/ssl
    mkdir -p logs
    
    # Create Docker network
    docker network create chatbot-network 2>/dev/null || log_info "Network already exists"
    
    log_info "✅ Setup completed!"
    log_warn "Don't forget to update .env file with your credentials!"
}

# Build all images
build() {
    log_info "🔨 Building Docker images..."
    
    docker-compose -f $COMPOSE_FILE build --parallel
    
    log_info "✅ Build completed!"
}

# Deploy the application
deploy() {
    log_info "🚀 Deploying Chatbot application..."
    
    # Check if .env exists
    if [[ ! -f .env ]]; then
        log_error ".env file not found. Run './docker-manage.sh setup' first."
        exit 1
    fi
    
    # Build and start services
    docker-compose -f $COMPOSE_FILE up -d --build
    
    log_info "⏳ Waiting for services to be healthy..."
    sleep 10
    
    # Wait for health checks
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
            log_warn "Some services are still starting... (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        else
            break
        fi
    done
    
    log_info "✅ Deployment completed!"
    status
}

# Show current status
status() {
    log_info "📊 Current Chatbot Status:"
    echo ""
    
    log_blue "Services:"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    
    log_blue "Health Status:"
    docker-compose -f $COMPOSE_FILE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    log_blue "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo ""
    
    log_blue "Access URLs:"
    echo "🌐 Frontend: http://localhost"
    echo "🔌 API Gateway: http://localhost:8080"
    echo "📊 Health Check: http://localhost:8080/health"
    echo "📈 Metrics: http://localhost:8080/metrics"
    echo "📋 Load Status: http://localhost:8080/load"
    echo "🔍 Nginx Status: http://localhost:9090/nginx_status"
}

# Scale a specific service
scale() {
    local service=$1
    local replicas=$2
    
    if [[ -z "$service" || -z "$replicas" ]]; then
        log_error "Usage: $0 scale <service> <replicas>"
        log_info "Available services: chat-service, user-service, api-gateway, voice-service, frontend"
        exit 1
    fi
    
    log_info "🔄 Scaling $service to $replicas instances..."
    docker-compose -f $COMPOSE_FILE up -d --scale $service=$replicas
    
    log_info "✅ Scaling completed!"
    status
}

# Show logs for a service
logs() {
    local service=${1:-}
    local lines=${2:-100}
    
    if [[ -z "$service" ]]; then
        log_info "📋 Showing logs for all services (last $lines lines)..."
        docker-compose -f $COMPOSE_FILE logs --tail=$lines -f
    else
        log_info "📋 Showing logs for $service (last $lines lines)..."
        docker-compose -f $COMPOSE_FILE logs --tail=$lines -f $service
    fi
}

# Get shell access to a container
shell() {
    local service=${1:-chat-service}
    
    log_info "🐚 Getting shell access to $service..."
    
    local container=$(docker-compose -f $COMPOSE_FILE ps -q $service | head -n1)
    
    if [[ -z "$container" ]]; then
        log_error "No running container found for service $service"
        exit 1
    fi
    
    docker exec -it $container /bin/sh
}

# Monitor resources in real-time
monitor() {
    log_info "📊 Real-time monitoring (Press Ctrl+C to stop)..."
    
    while true; do
        clear
        echo -e "${BLUE}=== Chatbot Docker Monitor ===${NC}"
        echo "$(date)"
        echo ""
        
        echo -e "${GREEN}Container Status:${NC}"
        docker-compose -f $COMPOSE_FILE ps
        echo ""
        
        echo -e "${GREEN}Resource Usage:${NC}"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
        echo ""
        
        echo -e "${GREEN}Health Checks:${NC}"
        for service in chat-service user-service api-gateway voice-service frontend; do
            local health=$(docker inspect --format='{{.State.Health.Status}}' ${PROJECT_NAME}_${service}_1 2>/dev/null || echo "no-healthcheck")
            echo "$service: $health"
        done
        
        sleep 5
    done
}

# Load test the application
load_test() {
    local duration=${1:-60}
    local concurrent=${2:-10}
    
    log_info "🔥 Running load test for ${duration}s with ${concurrent} concurrent users..."
    
    local url="http://localhost:8080/health"
    
    if command -v ab >/dev/null 2>&1; then
        ab -t $duration -c $concurrent $url
    elif command -v curl >/dev/null 2>&1; then
        log_warn "Apache Bench not found, using curl for basic test..."
        for i in $(seq 1 $concurrent); do
            curl -s $url >/dev/null &
        done
        wait
        log_info "Basic load test completed"
    else
        log_error "No load testing tools available (ab or curl)"
        exit 1
    fi
}

# Stop all services
stop() {
    log_info "🛑 Stopping Chatbot services..."
    docker-compose -f $COMPOSE_FILE stop
    log_info "✅ Services stopped!"
}

# Restart all services
restart() {
    log_info "🔄 Restarting Chatbot services..."
    docker-compose -f $COMPOSE_FILE restart
    log_info "✅ Services restarted!"
}

# Cleanup everything
cleanup() {
    log_warn "🗑️  This will remove ALL containers, images, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Stopping and removing containers..."
        docker-compose -f $COMPOSE_FILE down -v --rmi all
        
        log_info "Removing network..."
        docker network rm chatbot-network 2>/dev/null || true
        
        log_info "Cleaning up unused Docker resources..."
        docker system prune -f
        
        log_info "✅ Cleanup completed!"
    else
        log_info "Cleanup cancelled"
    fi
}

# Show help
help() {
    echo "Chatbot Docker Management Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup                     - Initial setup (create .env, network, etc.)"
    echo "  build                     - Build all Docker images"
    echo "  deploy                    - Deploy the entire application"
    echo "  status                    - Show current deployment status"
    echo "  scale <service> <count>   - Scale a service to specified replicas"
    echo "  logs [service] [lines]    - Show logs (default: all services, 100 lines)"
    echo "  shell [service]           - Get shell access (default: chat-service)"
    echo "  monitor                   - Real-time monitoring dashboard"
    echo "  load-test [duration] [concurrent] - Run load test (default: 60s, 10 users)"
    echo "  stop                      - Stop all services"
    echo "  restart                   - Restart all services"
    echo "  cleanup                   - Remove all containers, images, and volumes"
    echo "  help                      - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 deploy"
    echo "  $0 scale chat-service 3"
    echo "  $0 logs chat-service 200"
    echo "  $0 load-test 120 20"
    echo ""
    echo "Access URLs after deployment:"
    echo "  Frontend: http://localhost"
    echo "  API: http://localhost:8080"
    echo "  Health: http://localhost:8080/health"
}

# Main execution
main() {
    check_docker
    
    case "${1:-help}" in
        "setup")
            setup
            ;;
        "build")
            build
            ;;
        "deploy")
            deploy
            ;;
        "status")
            status
            ;;
        "scale")
            scale "${2:-}" "${3:-}"
            ;;
        "logs")
            logs "${2:-}" "${3:-}"
            ;;
        "shell")
            shell "${2:-}"
            ;;
        "monitor")
            monitor
            ;;
        "load-test")
            load_test "${2:-}" "${3:-}"
            ;;
        "stop")
            stop
            ;;
        "restart")
            restart
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            help
            ;;
    esac
}

main "$@"
