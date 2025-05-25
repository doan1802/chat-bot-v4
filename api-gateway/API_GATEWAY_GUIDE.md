# API Gateway Configuration Guide

## Tổng quan

API Gateway là điểm trung tâm xử lý tất cả các yêu cầu từ frontend và chuyển tiếp đến các microservices tương ứng.

## Kiến trúc

```
Frontend (Port 3000)
    ↓
API Gateway (Port 3000)
    ├── User Service (Port 3001)
    ├── Chat Service (Port 3004)
    └── Voice Service (Port 3005)
```

## Route Mapping

### User Service Routes
```
Frontend Request                    → Backend Service
POST /api/user-service/auth/login   → POST http://localhost:3001/api/auth/login
POST /api/user-service/auth/register → POST http://localhost:3001/api/auth/register
GET  /api/user-service/users/profile → GET  http://localhost:3001/api/users/profile
GET  /api/user-service/settings     → GET  http://localhost:3001/api/settings
PUT  /api/user-service/settings     → PUT  http://localhost:3001/api/settings
```

### Chat Service Routes
```
Frontend Request                           → Backend Service
GET  /api/chat-service/chats               → GET  http://localhost:3004/api/chats
POST /api/chat-service/chats               → POST http://localhost:3004/api/chats
GET  /api/chat-service/chats/:chatId       → GET  http://localhost:3004/api/chats/:chatId
POST /api/chat-service/chats/:chatId/messages → POST http://localhost:3004/api/chats/:chatId/messages
```

### Voice Service Routes
```
Frontend Request                              → Backend Service
GET  /api/voice-service/voice/config          → GET  http://localhost:3005/api/voice/config
GET  /api/voice-service/voice/web-token       → GET  http://localhost:3005/api/voice/web-token
POST /api/voice-service/voice/calls           → POST http://localhost:3005/api/voice/calls
GET  /api/voice-service/voice/calls/:callId   → GET  http://localhost:3005/api/voice/calls/:callId
PUT  /api/voice-service/voice/calls/:callId   → PUT  http://localhost:3005/api/voice/calls/:callId
DELETE /api/voice-service/voice/calls/:callId → DELETE http://localhost:3005/api/voice/calls/:callId
GET  /api/voice-service/voice/history         → GET  http://localhost:3005/api/voice/history
```

## Authentication Flow

### Public Routes (Không cần xác thực)
- `POST /api/user-service/auth/login`
- `POST /api/user-service/auth/register`
- `GET /health`

### Protected Routes (Cần xác thực)
Tất cả các routes khác yêu cầu JWT token trong header:
```
Authorization: Bearer <jwt-token>
```

### Quy trình xác thực
1. Client gửi login request
2. API Gateway chuyển tiếp đến User Service
3. User Service trả về JWT token
4. Client gửi token trong các request tiếp theo
5. API Gateway verify token trước khi chuyển tiếp

## Environment Variables

### Required
```bash
PORT=3000                                    # API Gateway port
USER_SERVICE_URL=http://localhost:3001       # User service URL
CHAT_SERVICE_URL=http://localhost:3004       # Chat service URL  
VOICE_SERVICE_URL=http://localhost:3005      # Voice service URL
JWT_SECRET=your_jwt_secret                   # JWT signing secret
```

### Optional
```bash
NODE_ENV=development                         # Environment mode
```

## Proxy Configuration

### Timeouts
- **User Service**: 30 seconds
- **Chat Service**: 60 seconds (for Gemini API calls)
- **Voice Service**: 10 seconds

### Buffer Settings
- Max body size: 10MB
- Buffer enabled for all services

### Error Handling
- Automatic error logging
- Graceful error responses
- Service health monitoring

## CORS Configuration

```javascript
origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Instance', 'X-Request-ID']
credentials: true
```

## Cluster Mode

API Gateway sử dụng Node.js cluster để tận dụng nhiều CPU cores:
- Master process quản lý workers
- Mỗi CPU core có 1 worker process
- Automatic worker restart khi crash

## Monitoring & Logging

### Health Check
```
GET /health
Response: { "status": "ok", "service": "api-gateway" }
```

### Logging Levels
- **Development**: Chi tiết requests, responses, errors
- **Production**: Chỉ errors và critical events

## Testing

Chạy script test để kiểm tra cấu hình:
```bash
cd api-gateway
node test-routes.js
```

## Troubleshooting

### Common Issues

**"No response from service"**
- Kiểm tra service có đang chạy không
- Verify URL trong environment variables
- Check network connectivity

**"Invalid token"**
- Verify JWT_SECRET giống nhau across services
- Check token format (Bearer <token>)
- Ensure token chưa expired

**"Proxy error"**
- Check timeout settings
- Verify path rewriting
- Check service health

### Debug Steps
1. Set `NODE_ENV=development`
2. Check API Gateway logs
3. Test services directly
4. Verify environment variables
5. Check CORS settings
