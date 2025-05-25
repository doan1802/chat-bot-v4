# 🚀 Hướng dẫn Deployment

## 📋 Tổng quan

Tài liệu này hướng dẫn chi tiết cách deploy hệ thống Chatbot từ development đến production.

## 🛠️ Prerequisites

### System Requirements
- **OS**: macOS, Linux, hoặc Windows với WSL2
- **Docker**: Docker Desktop 4.0+
- **Memory**: Tối thiểu 8GB RAM
- **Storage**: Tối thiểu 10GB free space
- **Network**: Internet connection cho download images

### Software Requirements
```bash
# Kiểm tra Docker
docker --version          # >= 20.10.0
docker-compose --version  # >= 2.0.0

# Kiểm tra system resources
docker system info
```

## 🔧 Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd chat-bot-v3-main
```

### 2. Setup Permissions
```bash
# Make management script executable
chmod +x docker-manage.sh

# Verify permissions
ls -la docker-manage.sh
# Should show: -rwxr-xr-x
```

### 3. Initial Setup
```bash
# Run setup to create necessary files
./docker-manage.sh setup
```

## ⚙️ Configuration

### 1. Environment Variables
```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Required Configuration
```bash
# JWT Secret (generate strong secret)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# User Service Database (Supabase Project 1)
USER_SUPABASE_URL=https://your-user-project.supabase.co
USER_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Chat Service Database (Supabase Project 2)
CHAT_SUPABASE_URL=https://your-chat-project.supabase.co
CHAT_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Optional: AI Integration
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Supabase Setup
Nếu chưa có Supabase projects:

#### Tạo User Service Database:
1. Truy cập https://supabase.com
2. Tạo project mới cho User Service
3. Copy URL và Anon Key
4. Tạo tables cần thiết (xem user-service/README.md)

#### Tạo Chat Service Database:
1. Tạo project thứ 2 cho Chat Service
2. Copy URL và Anon Key
3. Tạo tables cần thiết (xem chat-service/README.md)

## 🐳 Docker Deployment

### 1. Development Deployment
```bash
# Deploy all services
./docker-manage.sh deploy

# Monitor deployment
./docker-manage.sh status
```

### 2. Production Deployment
```bash
# Set production environment
export NODE_ENV=production

# Deploy with production settings
./docker-manage.sh deploy

# Verify all services are healthy
./docker-manage.sh status
```

### 3. Verify Deployment
```bash
# Check all containers are running
docker ps

# Test API Gateway
curl http://localhost:8080/health

# Test Frontend
curl http://localhost

# Test authentication
curl -X POST http://localhost:8080/api/direct-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📊 Service Management

### Scaling Services
```bash
# Scale chat service for high load
./docker-manage.sh scale chat-service 3

# Scale user service
./docker-manage.sh scale user-service 2

# Check scaling status
./docker-manage.sh status
```

### Monitoring
```bash
# Real-time monitoring
./docker-manage.sh monitor

# View logs
./docker-manage.sh logs chat-service
./docker-manage.sh logs user-service

# View specific service logs
docker logs chatbot-chat-service -f
```

### Health Checks
```bash
# API Gateway health
curl http://localhost:8080/health

# Individual service health
curl http://localhost:8080/health/chat

# Metrics
curl http://localhost:8080/metrics

# Load status
curl http://localhost:8080/load
```

## 🔄 Updates & Maintenance

### Rolling Updates
```bash
# Update specific service
docker-compose build chat-service
docker-compose up -d chat-service

# Update all services
./docker-manage.sh stop
./docker-manage.sh deploy
```

### Backup & Recovery
```bash
# Backup Redis data
docker run --rm -v chatbot_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Backup logs
./docker-manage.sh logs > backup-logs-$(date +%Y%m%d).txt

# Database backup (Supabase handles this automatically)
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
./docker-manage.sh logs <service-name>

# Check container status
docker ps -a

# Restart specific service
docker restart chatbot-<service-name>
```

#### 2. Database Connection Issues
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/"

# Check environment variables
docker exec -it chatbot-user-service env | grep SUPABASE
```

#### 3. Network Issues
```bash
# Check Docker network
docker network ls
docker network inspect chatbot-network

# Test internal connectivity
docker exec -it chatbot-frontend curl http://api-gateway:3000/health
```

#### 4. Performance Issues
```bash
# Check resource usage
docker stats

# Check system resources
docker system df
docker system prune  # Clean up if needed
```

### Debug Commands
```bash
# Get shell access to container
./docker-manage.sh shell chat-service

# Check container configuration
docker inspect chatbot-chat-service

# View container processes
docker exec -it chatbot-chat-service ps aux
```

## 🌐 Production Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSL Configuration
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# For production, use Let's Encrypt or commercial certificates
```

### 3. Domain Setup
```bash
# Update nginx configuration with your domain
# Edit nginx/nginx.conf
server_name your-domain.com;

# Update environment variables
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 4. Firewall Configuration
```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH access

# Enable firewall
sudo ufw enable
```

### 5. Process Management
```bash
# Create systemd service for auto-start
sudo nano /etc/systemd/system/chatbot.service

[Unit]
Description=Chatbot Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/chat-bot-v3-main
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target

# Enable service
sudo systemctl enable chatbot.service
sudo systemctl start chatbot.service
```

## 📈 Performance Optimization

### 1. Resource Limits
```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '1.0'
    reservations:
      memory: 256M
      cpus: '0.5'
```

### 2. Caching Strategy
```bash
# Redis configuration for production
redis:
  command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

### 3. Database Optimization
- Enable connection pooling
- Use read replicas for Supabase
- Implement query optimization
- Set up proper indexes

## 🔒 Security Hardening

### 1. Network Security
```bash
# Restrict Docker network access
# Use custom networks with limited scope
# Implement proper firewall rules
```

### 2. Container Security
```bash
# Run containers as non-root user
# Use minimal base images
# Regular security updates
```

### 3. Application Security
```bash
# Strong JWT secrets
# Rate limiting configuration
# Input validation
# HTTPS enforcement
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Supabase databases set up
- [ ] SSL certificates ready (production)
- [ ] Domain DNS configured (production)
- [ ] Firewall rules configured
- [ ] Backup strategy in place

### Deployment
- [ ] Services deployed successfully
- [ ] All health checks passing
- [ ] Frontend accessible
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Database connections established

### Post-deployment
- [ ] Monitoring set up
- [ ] Logs being collected
- [ ] Performance metrics baseline
- [ ] Backup verification
- [ ] Security scan completed
- [ ] Load testing performed

## 🆘 Support

### Getting Help
- Check service-specific README files
- Review logs with `./docker-manage.sh logs`
- Use `./docker-manage.sh status` for overview
- Check GitHub issues for known problems

### Emergency Procedures
```bash
# Quick restart all services
./docker-manage.sh restart

# Emergency stop
./docker-manage.sh stop

# Complete cleanup and redeploy
./docker-manage.sh cleanup
./docker-manage.sh deploy
```

---

**Deployment thành công! Hệ thống Chatbot đã sẵn sàng phục vụ người dùng.** 🎉
