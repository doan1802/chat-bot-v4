const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const voiceRoutes = require('./routes/voiceRoutes');

// Khởi tạo cache để lưu trữ thông tin cuộc gọi
const callCache = new NodeCache({ stdTTL: 900, checkperiod: 300 }); // TTL 15 phút, kiểm tra mỗi 5 phút

// Lưu trữ các phiên gọi đang hoạt động
// Key: callId, Value: { userId, clientInstance, lastActivity, isProcessing }
const activeCalls = new Map();

// Hàm dọn dẹp các phiên gọi không hoạt động
function cleanupInactiveCalls() {
  const now = Date.now();
  let cleanupCount = 0;

  activeCalls.forEach((session, callId) => {
    // Nếu phiên không hoạt động trong 30 phút, xóa khỏi Map
    if (now - session.lastActivity > 30 * 60 * 1000) {
      activeCalls.delete(callId);
      cleanupCount++;
    }
  });

  if (cleanupCount > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Cleaned up ${cleanupCount} inactive call sessions`);
  }
}

// Thiết lập dọn dẹp định kỳ
setInterval(cleanupInactiveCalls, 5 * 60 * 1000); // Mỗi 5 phút

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Instance', 'X-Request-ID'],
  credentials: true
}));
app.use(express.json());

// Middleware để đảm bảo header X-Client-Instance luôn được xử lý đúng
app.use((req, res, next) => {
  // Kiểm tra và xử lý header X-Client-Instance
  const clientInstance = req.headers['x-client-instance'];

  // Nếu không có header X-Client-Instance, log cảnh báo trong môi trường phát triển
  if (!clientInstance && process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Warning: Missing X-Client-Instance header for ${req.method} ${req.url}`);
  }

  next();
});

// Middleware để xử lý đồng thời
app.use((req, res, next) => {
  // Thêm thông tin worker process vào response header
  res.setHeader('X-Worker-ID', process.pid);

  // Thêm timestamp để theo dõi thời gian xử lý
  req.startTime = Date.now();

  // Chỉ log request trong môi trường phát triển hoặc không phải OPTIONS/health check
  if ((process.env.NODE_ENV === 'development' || req.method !== 'OPTIONS') &&
      !req.url.includes('/health')) {
    console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url}`);
  }

  // Xử lý response
  const originalSend = res.send;
  res.send = function(body) {
    // Tính thời gian xử lý
    const duration = Date.now() - req.startTime;

    // Thêm header thời gian xử lý
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log thời gian xử lý nếu lâu hơn 1000ms hoặc trong môi trường phát triển
    if (duration > 1000 || process.env.NODE_ENV === 'development') {
      if (!req.url.includes('/health') && req.method !== 'OPTIONS') {
        console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url} completed in ${duration}ms`);
      }
    }

    return originalSend.call(this, body);
  };

  next();
});

// Middleware để quản lý phiên gọi
app.use('/api/calls/:callId', (req, res, next) => {
  if (req.method === 'POST') {
    const callId = req.params.callId;
    const userId = req.user?.id;
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Kiểm tra xem phiên gọi đã tồn tại chưa
    if (!activeCalls.has(callId)) {
      // Tạo phiên gọi mới
      activeCalls.set(callId, {
        userId,
        clientInstance,
        lastActivity: Date.now(),
        isProcessing: true
      });
    } else {
      // Cập nhật thông tin phiên gọi
      const callSession = activeCalls.get(callId);
      callSession.lastActivity = Date.now();
      callSession.clientInstance = clientInstance;
    }
  }
  next();
});

// Expose cache and active calls to routes
app.locals.callCache = callCache;
app.locals.activeCalls = activeCalls;

// Routes
app.use('/api/voice', voiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'voice-service' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
