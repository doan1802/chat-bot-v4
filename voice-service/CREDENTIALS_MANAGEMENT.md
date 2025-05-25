# Quản lý Credentials cho Voice Service

## Tổng quan

Voice Service hỗ trợ hai loại credentials để kết nối với VAPI:
1. **VAPI_API_KEY**: Dùng cho server-to-server communication (backend)
2. **VAPI_WEB_TOKEN**: Dùng cho client-side communication (frontend)

## Cơ chế ưu tiên

Hệ thống sử dụng cơ chế ưu tiên như sau:

### 1. VAPI API Key (Backend)
```
1. Ưu tiên cao nhất: User settings (vapi_api_key trong database)
2. Fallback: Environment variable (VAPI_API_KEY trong .env)
3. Nếu không có: Trả về lỗi yêu cầu cấu hình
```

### 2. VAPI Web Token (Frontend)
```
1. Ưu tiên cao nhất: User settings (vapi_web_token trong database)
2. Fallback: Environment variable (VAPI_WEB_TOKEN trong .env)
3. Nếu không có: Trả về lỗi yêu cầu cấu hình
```

## Cách người dùng cấu hình

### Trong Frontend:
1. Click vào avatar → Settings
2. Nhập:
   - **VAPI API Key**: Key cho backend communication
   - **VAPI Web Token**: Token cho frontend client
3. Click "Save Changes"

### Trong Database:
Credentials được lưu trong bảng `settings`:
```sql
SELECT vapi_api_key, vapi_web_token 
FROM settings 
WHERE user_id = 'user-id';
```

## Logging và Debug

Trong môi trường development, hệ thống sẽ log thông tin về nguồn credentials:

```
[Client: client-id] Using VAPI API key from: user settings
[Client: client-id] Using VAPI Web Token from: environment variable
```

## API Endpoints

### GET /api/voice/config
Trả về VAPI API key cho backend sử dụng.

**Response:**
```json
{
  "config": {
    "apiKey": "vapi-api-key",
    "language": "vi"
  }
}
```

### GET /api/voice/web-token
Trả về VAPI Web Token và cấu hình assistant cho frontend.

**Response:**
```json
{
  "token": "vapi-web-token",
  "assistant": {
    "name": "Trợ lý Serna",
    "firstMessage": "Xin chào! Tôi là trợ lý Serna...",
    // ... assistant config
  }
}
```

## Bảo mật

- Tất cả credentials được mã hóa khi lưu trữ
- API keys không được log trong production
- Chỉ user sở hữu mới có thể truy cập credentials của mình
- Environment variables chỉ được sử dụng làm fallback

## Troubleshooting

### Lỗi "VAPI API key not configured"
1. Kiểm tra user đã cấu hình API key trong settings chưa
2. Kiểm tra environment variable VAPI_API_KEY
3. Kiểm tra kết nối với user-service

### Lỗi "VAPI Web Token not configured"
1. Kiểm tra user đã cấu hình Web Token trong settings chưa
2. Kiểm tra environment variable VAPI_WEB_TOKEN
3. Kiểm tra kết nối với user-service

### Debug Steps
1. Bật NODE_ENV=development để xem logs
2. Kiểm tra response từ user-service
3. Kiểm tra database settings table
4. Kiểm tra environment variables
