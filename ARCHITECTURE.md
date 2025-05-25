# 🏗️ Kiến trúc hệ thống Chatbot

## 📋 Tổng quan kiến trúc

Hệ thống Chatbot được thiết kế theo mô hình **Microservices Architecture** với các nguyên tắc:
- **Separation of Concerns** - Mỗi service có trách nhiệm riêng
- **Scalability** - Có thể scale từng service độc lập
- **Fault Tolerance** - Lỗi ở một service không ảnh hưởng toàn bộ
- **Technology Diversity** - Mỗi service có thể dùng tech stack khác nhau

## 🔄 Data Flow

### 1. User Authentication Flow
```
User → Frontend → Nginx → API Gateway → User Service → Supabase 1
                                    ↓
                              JWT Token ← ← ← ← ← ← ← ← ← ← ←
```

### 2. Chat Message Flow
```
User → Frontend → Nginx → API Gateway → Chat Service → Supabase 2
                                    ↓
                              Message Response ← ← ← ← ← ← ← ←
```

### 3. Voice Communication Flow
```
User → Frontend → Nginx → API Gateway → Voice Service → External APIs
                                    ↓
                              Audio Response ← ← ← ← ← ← ← ← ← ←
```

## 🏢 Service Architecture

### 🌐 Frontend Layer
**Technology**: Next.js 15 + TypeScript
```
┌─────────────────────────────────────┐
│           Frontend (Next.js)        │
├─────────────────────────────────────┤
│ • Server-Side Rendering (SSR)      │
│ • Client-Side Routing              │
│ • State Management (React Context) │
│ • API Integration                  │
│ • Authentication Handling          │
└─────────────────────────────────────┘
```

**Responsibilities**:
- User interface rendering
- Client-side routing
- State management
- API calls to backend
- Authentication token handling

### 🔀 Load Balancer Layer
**Technology**: Nginx
```
┌─────────────────────────────────────┐
│            Nginx Load Balancer      │
├─────────────────────────────────────┤
│ • Reverse Proxy                    │
│ • Load Balancing                   │
│ • SSL Termination                  │
│ • Static File Serving              │
│ • Rate Limiting                    │
└─────────────────────────────────────┘
```

**Responsibilities**:
- Route traffic to appropriate services
- Load balance between multiple instances
- Handle SSL certificates
- Serve static assets
- Implement rate limiting

### 🚪 API Gateway Layer
**Technology**: Node.js + Express
```
┌─────────────────────────────────────┐
│           API Gateway               │
├─────────────────────────────────────┤
│ • Request Routing                  │
│ • Authentication Middleware        │
│ • Request/Response Transformation  │
│ • Logging & Monitoring            │
│ • CORS Handling                   │
└─────────────────────────────────────┘
```

**Responsibilities**:
- Central entry point for all API requests
- Route requests to appropriate microservices
- Handle cross-cutting concerns (auth, logging, CORS)
- Request/response transformation
- API versioning

### 👤 User Service
**Technology**: Node.js + Express + Supabase
```
┌─────────────────────────────────────┐
│            User Service             │
├─────────────────────────────────────┤
│ • User Registration                │
│ • User Authentication              │
│ • Profile Management              │
│ • JWT Token Generation            │
│ • Password Management             │
└─────────────────────────────────────┘
```

**Database**: Supabase Project 1 (xiihrmbbipdeuqanpkfk)
**Tables**:
- `users` - User profiles
- `auth.users` - Authentication data
- `sessions` - User sessions

### 💬 Chat Service
**Technology**: Node.js + Express + Supabase
```
┌─────────────────────────────────────┐
│            Chat Service             │
├─────────────────────────────────────┤
│ • Chat Room Management            │
│ • Message Handling                │
│ • Real-time Communication         │
│ • AI Integration                  │
│ • Message History                 │
└─────────────────────────────────────┘
```

**Database**: Supabase Project 2 (bezykksvhjkilfkcbqgb)
**Tables**:
- `chats` - Chat rooms
- `messages` - Chat messages
- `chat_participants` - Chat members

### 🎤 Voice Service
**Technology**: Node.js + Express + External APIs
```
┌─────────────────────────────────────┐
│           Voice Service             │
├─────────────────────────────────────┤
│ • Voice Chat Handling             │
│ • Audio Processing                │
│ • Speech-to-Text                  │
│ • Text-to-Speech                  │
│ • Real-time Audio Streaming       │
└─────────────────────────────────────┘
```

**External Integrations**:
- VAPI.ai for voice processing
- WebRTC for real-time communication

## 🗄️ Database Architecture

### Separate Database Strategy
Dự án sử dụng **Database per Service** pattern:

```
┌─────────────────┐    ┌─────────────────┐
│   User Service  │────│   Supabase 1    │
│                 │    │   (Users DB)    │
└─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│   Chat Service  │────│   Supabase 2    │
│                 │    │   (Chats DB)    │
└─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│   All Services  │────│     Redis       │
│                 │    │    (Cache)      │
└─────────────────┘    └─────────────────┘
```

**Benefits**:
- **Data Isolation** - Mỗi service quản lý data riêng
- **Independent Scaling** - Scale database theo nhu cầu service
- **Technology Flexibility** - Mỗi service có thể dùng DB khác nhau
- **Fault Isolation** - Lỗi DB không ảnh hưởng cross-service

## 🔄 Communication Patterns

### 1. Synchronous Communication
**HTTP/REST APIs** giữa các services:
```
Frontend ──HTTP──> API Gateway ──HTTP──> Microservices
```

### 2. Asynchronous Communication
**Redis Pub/Sub** cho real-time features:
```
Chat Service ──Publish──> Redis ──Subscribe──> Frontend
```

### 3. Database Communication
**Direct database access** trong mỗi service:
```
User Service ──SQL──> Supabase 1
Chat Service ──SQL──> Supabase 2
```

## 🔒 Security Architecture

### Authentication Flow
```
1. User login → User Service
2. JWT token generation
3. Token stored in frontend
4. Token validation in API Gateway
5. Authorized requests to services
```

### Security Layers
```
┌─────────────────────────────────────┐
│        Security Layers              │
├─────────────────────────────────────┤
│ 1. Nginx Rate Limiting             │
│ 2. API Gateway CORS                │
│ 3. JWT Token Validation            │
│ 4. Service-level Authorization     │
│ 5. Database Row-level Security     │
└─────────────────────────────────────┘
```

## 📊 Monitoring & Observability

### Health Check Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Health Checks │
│                 │    │   /health       │
└─────────────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │Service A  │ │Service B  │ │Service C  │
            │/health    │ │/health    │ │/health    │
            └───────────┘ └───────────┘ └───────────┘
```

### Metrics Collection
```
Services → Prometheus Metrics → Monitoring Dashboard
         → Application Logs   → Log Aggregation
         → Performance Data   → APM Tools
```

## 🚀 Scaling Strategy

### Horizontal Scaling
```
┌─────────────────┐
│   Load Balancer │
└─────────┬───────┘
          │
    ┌─────┼─────┐
    │     │     │
┌───▼─┐ ┌─▼──┐ ┌▼───┐
│Svc 1│ │Svc2│ │Svc3│  ← Multiple instances
└─────┘ └────┘ └────┘
```

### Service-specific Scaling
- **Chat Service**: Scale based on concurrent users
- **User Service**: Scale based on authentication load
- **Voice Service**: Scale based on voice sessions
- **Frontend**: Scale based on page views

## 🔧 Deployment Architecture

### Docker Container Strategy
```
┌─────────────────────────────────────┐
│           Docker Host               │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │Frontend │ │API GW   │ │User Svc │ │
│ │Container│ │Container│ │Container│ │
│ └─────────┘ └─────────┘ └─────────┘ │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │Chat Svc │ │Voice Svc│ │ Redis   │ │
│ │Container│ │Container│ │Container│ │
│ └─────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────┘
```

### Network Architecture
```
┌─────────────────────────────────────┐
│        Docker Network               │
├─────────────────────────────────────┤
│ • Internal service communication    │
│ • Service discovery                │
│ • Network isolation               │
│ • Port mapping                    │
└─────────────────────────────────────┘
```

## 🔄 CI/CD Pipeline (Future)

### Deployment Pipeline
```
Code → Build → Test → Package → Deploy → Monitor
  │      │       │       │        │        │
  │      │       │       │        │        └─ Health Checks
  │      │       │       │        └─ Rolling Deployment
  │      │       │       └─ Docker Images
  │      │       └─ Unit/Integration Tests
  │      └─ Docker Build
  └─ Git Push
```

## 📈 Performance Considerations

### Caching Strategy
- **Redis**: Session storage, API response caching
- **CDN**: Static asset delivery
- **Database**: Query optimization, indexing

### Load Balancing
- **Round Robin**: Default distribution
- **Least Connections**: For long-running requests
- **Health-based**: Avoid unhealthy instances

### Database Optimization
- **Connection Pooling**: Efficient DB connections
- **Query Optimization**: Indexed queries
- **Read Replicas**: Scale read operations

---

**Kiến trúc này đảm bảo tính scalability, maintainability, và reliability cho hệ thống Chatbot.**
