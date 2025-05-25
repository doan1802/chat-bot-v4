# 🤖 Chatbot Microservices Platform

Một hệ thống chatbot hiện đại được xây dựng với kiến trúc microservices, sử dụng Docker, Next.js, và Supabase.

## 📋 Tổng quan

Dự án này là một nền tảng chatbot đầy đủ tính năng với:
- **Kiến trúc Microservices** - Các service độc lập, dễ scale
- **Load Balancing** - Nginx với auto-scaling
- **Separate Databases** - 2 Supabase projects riêng biệt
- **Modern Frontend** - Next.js với TypeScript
- **Production Ready** - Docker containerization

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Nginx LB      │
│   (Next.js)     │    │   (Port 80)     │
└─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   API Gateway   │
                       │   (Port 8080)   │
                       └─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│User Service │        │Chat Service │        │Voice Service│
│(Port 3001)  │        │(Port 3004)  │        │(Port 3005)  │
└─────────────┘        └─────────────┘        └─────────────┘
        │                       │                       │
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│ Supabase 1  │        │ Supabase 2  │        │   Redis     │
│(Users DB)   │        │(Chats DB)   │        │  (Cache)    │
└─────────────┘        └─────────────┘        └─────────────┘
```

## 🚀 Tính năng chính

### 🔐 Authentication & User Management
- Đăng ký/Đăng nhập với Supabase Auth
- JWT token authentication
- Profile management
- Session handling

### 💬 Chat System
- Real-time messaging
- Multiple chat rooms
- Message history
- AI integration ready

### 🎤 Voice Integration
- Voice chat capabilities
- Audio processing
- Real-time communication

### 📊 Monitoring & Scaling
- Health checks cho tất cả services
- Prometheus metrics
- Auto-scaling với Docker
- Load balancing

## 📁 Cấu trúc dự án

```
chat-bot-v3-main/
├── 🔧 Core Services
│   ├── api-gateway/              # API Gateway & Routing
│   │   ├── src/
│   │   │   ├── app.js           # Main application
│   │   │   ├── routes/          # Route definitions
│   │   │   └── middleware/      # Custom middleware
│   │   └── Dockerfile
│   │
│   ├── user-service/            # User Management
│   │   ├── src/
│   │   │   ├── controllers/     # User controllers
│   │   │   ├── routes/          # User routes
│   │   │   └── middleware/      # Auth middleware
│   │   └── Dockerfile
│   │
│   ├── chat-service/            # Chat & Messaging
│   │   ├── src/
│   │   │   ├── controllers/     # Chat controllers
│   │   │   ├── services/        # Business logic
│   │   │   └── utils/           # Utilities
│   │   ├── scripts/             # Database scripts
│   │   └── Dockerfile
│   │
│   ├── voice-service/           # Voice Features
│   │   ├── src/
│   │   │   ├── controllers/     # Voice controllers
│   │   │   └── routes/          # Voice routes
│   │   └── Dockerfile
│   │
│   └── frontend-chatbot-1/      # Next.js Frontend
│       ├── app/                 # App router
│       ├── components/          # React components
│       ├── lib/                 # Utilities & API
│       ├── contexts/            # React contexts
│       └── public/              # Static assets
│
├── 🐳 Docker & Infrastructure
│   ├── docker-compose.yml       # Service orchestration
│   ├── docker-manage.sh         # Management script
│   └── nginx/
│       └── nginx.conf           # Load balancer config
│
└── ⚙️ Configuration
    ├── .env                     # Environment variables
    └── .env.example             # Environment template
```

## 🛠️ Tech Stack

### Backend Services
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database & Authentication
- **Redis** - Caching & Sessions
- **JWT** - Token authentication

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **React Hook Form** - Form handling

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Load balancer & Reverse proxy
- **Docker Compose** - Multi-container orchestration

### Databases
- **Supabase Project 1** - User data (xiihrmbbipdeuqanpkfk)
- **Supabase Project 2** - Chat data (bezykksvhjkilfkcbqgb)
- **Redis** - Caching & Session storage

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- Node.js 18+ (for development)
- Git

### 1. Clone & Setup
```bash
git clone <repository-url>
cd chat-bot-v3-main

# Setup environment
chmod +x docker-manage.sh
./docker-manage.sh setup
```

### 2. Configure Environment
```bash
# Edit .env file with your credentials
nano .env

# Required variables:
# JWT_SECRET=your-jwt-secret
# USER_SUPABASE_URL=https://your-user-project.supabase.co
# USER_SUPABASE_ANON_KEY=your-user-key
# CHAT_SUPABASE_URL=https://your-chat-project.supabase.co
# CHAT_SUPABASE_ANON_KEY=your-chat-key
```

### 3. Deploy
```bash
# Deploy all services
./docker-manage.sh deploy

# Check status
./docker-manage.sh status
```

### 4. Access Application
- **Frontend**: http://localhost
- **API Gateway**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

## 📊 Management Commands

```bash
# Deployment
./docker-manage.sh deploy          # Deploy all services
./docker-manage.sh status          # Check status
./docker-manage.sh restart         # Restart all services

# Scaling
./docker-manage.sh scale chat-service 3    # Scale to 3 instances
./docker-manage.sh scale user-service 2    # Scale to 2 instances

# Monitoring
./docker-manage.sh monitor         # Real-time monitoring
./docker-manage.sh logs <service>   # View logs
./docker-manage.sh shell <service> # Access container shell

# Testing
./docker-manage.sh load-test 60 10 # Load test (60s, 10 users)

# Cleanup
./docker-manage.sh stop            # Stop all services
./docker-manage.sh cleanup         # Remove all containers
```

## 🔧 Development

### Local Development
```bash
# Start individual services for development
cd user-service && npm run dev
cd chat-service && npm run dev
cd frontend-chatbot-1 && npm run dev
```

### Testing
```bash
# Test API endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/direct-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📈 Monitoring & Metrics

### Health Checks
- **API Gateway**: http://localhost:8080/health
- **Chat Service**: http://localhost:8080/health/chat
- **Metrics**: http://localhost:8080/metrics
- **Load Status**: http://localhost:8080/load

### Prometheus Metrics
```bash
# View metrics
curl http://localhost:8080/metrics

# Key metrics:
# - http_requests_total
# - requests_per_second
# - memory_usage_bytes
# - active_connections
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **CORS Protection** - Cross-origin request filtering
- **Rate Limiting** - API request throttling
- **Input Validation** - Request data validation
- **Environment Variables** - Secure configuration

## 🌐 Production Deployment

### Environment Setup
1. Update `.env` with production values
2. Configure SSL certificates in `nginx/ssl/`
3. Set up domain DNS records
4. Configure monitoring alerts

### Scaling Guidelines
- **Chat Service**: Scale based on concurrent users
- **User Service**: Scale based on authentication load
- **Database**: Monitor Supabase usage limits
- **Redis**: Scale for session storage needs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check service-specific README files
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

---

**Built with ❤️ using modern microservices architecture**
