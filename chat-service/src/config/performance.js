// Performance optimization configuration
const NodeCache = require('node-cache');

// Cấu hình cache tối ưu
const cacheConfig = {
  // Cache cho chat data
  chatCache: {
    stdTTL: 600,        // 10 phút
    checkperiod: 120,   // Kiểm tra mỗi 2 phút
    useClones: false,   // Không clone để tăng tốc độ
    deleteOnExpire: true,
    maxKeys: 1000       // Giới hạn số lượng key
  },
  
  // Cache cho message data
  messageCache: {
    stdTTL: 300,        // 5 phút
    checkperiod: 60,    // Kiểm tra mỗi phút
    useClones: false,
    deleteOnExpire: true,
    maxKeys: 2000
  },
  
  // Cache cho user sessions
  sessionCache: {
    stdTTL: 1800,       // 30 phút
    checkperiod: 300,   // Kiểm tra mỗi 5 phút
    useClones: false,
    deleteOnExpire: true,
    maxKeys: 500
  }
};

// Rate limiting configuration
const rateLimitConfig = {
  // Giới hạn request cho chat API
  chatLimit: {
    windowMs: 60 * 1000,    // 1 phút
    max: 30,                // 30 requests per minute
    message: 'Too many chat requests, please try again later'
  },
  
  // Giới hạn request cho message API
  messageLimit: {
    windowMs: 60 * 1000,    // 1 phút
    max: 20,                // 20 messages per minute
    message: 'Too many messages, please slow down'
  }
};

// Database connection optimization
const dbConfig = {
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  
  // Query optimization
  query: {
    timeout: 10000,         // 10 seconds
    maxRetries: 3,
    retryDelay: 1000
  }
};

// Gemini API optimization
const geminiConfig = {
  // Request settings
  timeout: 30000,           // 30 seconds
  maxRetries: 3,
  retryDelay: 1000,
  
  // Generation settings for better performance
  generation: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 1024,  // Giảm để tăng tốc độ
    candidateCount: 1
  },
  
  // Session management
  sessionTimeout: 30 * 60 * 1000,  // 30 phút
  maxSessions: 100
};

// Memory management
const memoryConfig = {
  // Garbage collection hints
  gcInterval: 5 * 60 * 1000,    // 5 phút
  
  // Memory thresholds
  maxMemoryUsage: 512 * 1024 * 1024,  // 512MB
  
  // Cleanup intervals
  cleanupInterval: 10 * 60 * 1000     // 10 phút
};

// Monitoring configuration
const monitoringConfig = {
  // Performance metrics
  metrics: {
    enabled: process.env.NODE_ENV === 'production',
    interval: 60000,        // 1 phút
    retention: 24 * 60      // 24 giờ
  },
  
  // Health check settings
  healthCheck: {
    interval: 30000,        // 30 giây
    timeout: 5000,          // 5 giây
    retries: 3
  }
};

// Error handling configuration
const errorConfig = {
  // Retry settings
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  },
  
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 10000
  }
};

module.exports = {
  cacheConfig,
  rateLimitConfig,
  dbConfig,
  geminiConfig,
  memoryConfig,
  monitoringConfig,
  errorConfig
};
