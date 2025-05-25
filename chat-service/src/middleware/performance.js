// Performance optimization middleware
const { performance } = require('perf_hooks');
const { memoryConfig } = require('../config/performance');

// Load monitoring - theo dõi tải hệ thống
class LoadMonitor {
  constructor() {
    this.currentLoad = {
      activeConnections: 0,
      requestsPerSecond: 0,
      avgResponseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      queueLength: 0
    };

    this.requestTimes = [];
    this.requestCount = 0;
    this.lastResetTime = Date.now();

    // Bắt đầu monitor
    this.startMonitoring();
  }

  // Theo dõi request mới
  trackRequest(req, res) {
    this.currentLoad.activeConnections++;
    this.requestCount++;

    const startTime = Date.now();

    res.on('finish', () => {
      this.currentLoad.activeConnections--;
      const responseTime = Date.now() - startTime;
      this.requestTimes.push(responseTime);

      // Giữ chỉ 100 request gần nhất
      if (this.requestTimes.length > 100) {
        this.requestTimes = this.requestTimes.slice(-100);
      }

      // Tính average response time
      this.currentLoad.avgResponseTime =
        this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    });
  }

  // Monitor hệ thống mỗi giây
  startMonitoring() {
    setInterval(() => {
      // Tính requests per second
      const now = Date.now();
      const timeDiff = (now - this.lastResetTime) / 1000;
      this.currentLoad.requestsPerSecond = this.requestCount / timeDiff;

      // Reset counter
      this.requestCount = 0;
      this.lastResetTime = now;

      // Monitor memory và CPU
      const memUsage = process.memoryUsage();
      this.currentLoad.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB

      // CPU usage (ước tính từ event loop delay)
      const start = process.hrtime();
      setImmediate(() => {
        const delta = process.hrtime(start);
        const nanosec = delta[0] * 1e9 + delta[1];
        const millisec = nanosec / 1e6;
        this.currentLoad.cpuUsage = Math.min(100, millisec); // Ước tính CPU %
      });

      // Kiểm tra overload
      this.checkOverload();
    }, 1000);
  }

  // Kiểm tra có bị quá tải không
  checkOverload() {
    const thresholds = {
      maxRequestsPerSecond: 50,    // 50 requests/giây
      maxResponseTime: 2000,       // 2 giây
      maxMemoryUsage: 400,         // 400MB
      maxCpuUsage: 80,            // 80% CPU
      maxActiveConnections: 100    // 100 kết nối đồng thời
    };

    const overloadReasons = [];

    if (this.currentLoad.requestsPerSecond > thresholds.maxRequestsPerSecond) {
      overloadReasons.push(`High RPS: ${this.currentLoad.requestsPerSecond.toFixed(2)}`);
    }

    if (this.currentLoad.avgResponseTime > thresholds.maxResponseTime) {
      overloadReasons.push(`Slow response: ${this.currentLoad.avgResponseTime.toFixed(2)}ms`);
    }

    if (this.currentLoad.memoryUsage > thresholds.maxMemoryUsage) {
      overloadReasons.push(`High memory: ${this.currentLoad.memoryUsage.toFixed(2)}MB`);
    }

    if (this.currentLoad.cpuUsage > thresholds.maxCpuUsage) {
      overloadReasons.push(`High CPU: ${this.currentLoad.cpuUsage.toFixed(2)}%`);
    }

    if (this.currentLoad.activeConnections > thresholds.maxActiveConnections) {
      overloadReasons.push(`Too many connections: ${this.currentLoad.activeConnections}`);
    }

    if (overloadReasons.length > 0) {
      console.warn('🚨 SERVER OVERLOAD DETECTED:', overloadReasons.join(', '));
      console.warn('💡 Consider scaling up or optimizing the service');

      // Có thể gửi alert qua email, Slack, etc.
      this.sendOverloadAlert(overloadReasons);
    }
  }

  // Gửi cảnh báo quá tải
  sendOverloadAlert(reasons) {
    // Ví dụ: gửi webhook đến Slack
    const alertData = {
      service: 'chat-service',
      port: 3004,
      timestamp: new Date().toISOString(),
      reasons: reasons,
      currentLoad: this.currentLoad
    };

    console.log('📧 ALERT SENT:', JSON.stringify(alertData, null, 2));

    // Trong thực tế, bạn có thể gửi đến:
    // - Slack webhook
    // - Email service
    // - SMS service
    // - Monitoring dashboard
  }

  // Lấy thông tin load hiện tại
  getCurrentLoad() {
    return {
      ...this.currentLoad,
      timestamp: new Date().toISOString(),
      status: this.getLoadStatus()
    };
  }

  // Đánh giá mức độ tải
  getLoadStatus() {
    const { requestsPerSecond, avgResponseTime, memoryUsage, cpuUsage, activeConnections } = this.currentLoad;

    if (requestsPerSecond > 40 || avgResponseTime > 1500 || memoryUsage > 300 || cpuUsage > 70) {
      return 'HIGH';
    } else if (requestsPerSecond > 20 || avgResponseTime > 1000 || memoryUsage > 200 || cpuUsage > 50) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }
}

// Tạo instance global
const loadMonitor = new LoadMonitor();

// Request timing middleware
const requestTiming = (req, res, next) => {
  const startTime = performance.now();

  // Add request ID for tracking
  req.requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  res.on('finish', () => {
    const duration = performance.now() - startTime;

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      console.warn(`[${req.requestId}] Slow request: ${req.method} ${req.url} took ${duration.toFixed(2)}ms`);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${req.requestId}] ${req.method} ${req.url} - ${res.statusCode} (${duration.toFixed(2)}ms)`);
    }
  });

  next();
};

// Memory monitoring middleware
const memoryMonitoring = (req, res, next) => {
  const memUsage = process.memoryUsage();

  // Check memory usage
  if (memUsage.heapUsed > memoryConfig.maxMemoryUsage) {
    console.warn(`High memory usage detected: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }

  next();
};

// Request compression middleware
const compression = require('compression');
const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress responses if the request includes a cache-control header to prevent compression
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Use compression filter function
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression level
  threshold: 1024 // Only compress responses larger than 1KB
});

// Response caching middleware
const responseCache = (duration = 300) => { // 5 minutes default
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;

    // Check if response is cached
    if (req.app.locals.responseCache && req.app.locals.responseCache.has(key)) {
      const cachedResponse = req.app.locals.responseCache.get(key);

      // Set cache headers
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${duration}`);

      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses
      if (res.statusCode === 200 && req.app.locals.responseCache) {
        req.app.locals.responseCache.set(key, data);
      }

      // Set cache headers
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${duration}`);

      return originalJson.call(this, data);
    };

    next();
  };
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const { rateLimitConfig } = require('../config/performance');

const createRateLimit = (config) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: { error: config.message },
    standardHeaders: true,
    legacyHeaders: false,
    // Custom key generator to include user ID
    keyGenerator: (req) => {
      return req.user ? `${req.ip}:${req.user.id}` : req.ip;
    }
  });
};

// Database query optimization middleware
const queryOptimization = (req, res, next) => {
  // Add query hints to request
  req.queryHints = {
    useIndex: true,
    limit: 100, // Default limit
    timeout: 10000 // 10 seconds
  };

  // Override query parameters for optimization
  if (req.query.limit && parseInt(req.query.limit) > 100) {
    req.query.limit = '100'; // Limit large queries
  }

  next();
};

// Error handling optimization
const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown';

  // Log error with request context
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    requestId: requestId,
    ...(isDevelopment && { stack: err.stack })
  });
};

// Health check middleware
const healthCheck = (req, res, next) => {
  if (req.path === '/health') {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return res.json({
      status: 'ok',
      service: 'chat-service',
      uptime: uptime,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = {
  LoadMonitor,
  loadMonitor,
  requestTiming,
  memoryMonitoring,
  compressionMiddleware,
  responseCache,
  createRateLimit,
  queryOptimization,
  errorHandler,
  healthCheck,
  rateLimitConfig
};
