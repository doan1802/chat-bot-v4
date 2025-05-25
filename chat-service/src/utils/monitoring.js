// Monitoring and metrics collection utilities
const { performance } = require('perf_hooks');

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0
      },
      gemini: {
        calls: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0,
        retries: 0
      },
      database: {
        queries: 0,
        success: 0,
        errors: 0,
        avgQueryTime: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    
    this.responseTimes = [];
    this.geminiResponseTimes = [];
    this.dbQueryTimes = [];
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  // Record request metrics
  recordRequest(duration, success = true) {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
    
    this.responseTimes.push(duration);
    this.updateAverageResponseTime();
  }

  // Record Gemini API metrics
  recordGeminiCall(duration, success = true, retried = false) {
    this.metrics.gemini.calls++;
    if (success) {
      this.metrics.gemini.success++;
    } else {
      this.metrics.gemini.errors++;
    }
    
    if (retried) {
      this.metrics.gemini.retries++;
    }
    
    this.geminiResponseTimes.push(duration);
    this.updateGeminiAverageResponseTime();
  }

  // Record database metrics
  recordDatabaseQuery(duration, success = true) {
    this.metrics.database.queries++;
    if (success) {
      this.metrics.database.success++;
    } else {
      this.metrics.database.errors++;
    }
    
    this.dbQueryTimes.push(duration);
    this.updateDbAverageQueryTime();
  }

  // Record cache metrics
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  // Update average response time
  updateAverageResponseTime() {
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100); // Keep last 100
    }
    
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.requests.avgResponseTime = sum / this.responseTimes.length;
  }

  // Update Gemini average response time
  updateGeminiAverageResponseTime() {
    if (this.geminiResponseTimes.length > 50) {
      this.geminiResponseTimes = this.geminiResponseTimes.slice(-50);
    }
    
    const sum = this.geminiResponseTimes.reduce((a, b) => a + b, 0);
    this.metrics.gemini.avgResponseTime = sum / this.geminiResponseTimes.length;
  }

  // Update database average query time
  updateDbAverageQueryTime() {
    if (this.dbQueryTimes.length > 100) {
      this.dbQueryTimes = this.dbQueryTimes.slice(-100);
    }
    
    const sum = this.dbQueryTimes.reduce((a, b) => a + b, 0);
    this.metrics.database.avgQueryTime = sum / this.dbQueryTimes.length;
  }

  // Update cache hit rate
  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  // Start memory monitoring
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memory = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024) // MB
      };
    }, 30000); // Every 30 seconds
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  // Get health status
  getHealthStatus() {
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.errors / this.metrics.requests.total) * 100 
      : 0;
    
    const geminiErrorRate = this.metrics.gemini.calls > 0
      ? (this.metrics.gemini.errors / this.metrics.gemini.calls) * 100
      : 0;

    const dbErrorRate = this.metrics.database.queries > 0
      ? (this.metrics.database.errors / this.metrics.database.queries) * 100
      : 0;

    let status = 'healthy';
    const issues = [];

    // Check error rates
    if (errorRate > 10) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    if (geminiErrorRate > 20) {
      status = 'degraded';
      issues.push(`High Gemini error rate: ${geminiErrorRate.toFixed(2)}%`);
    }

    if (dbErrorRate > 5) {
      status = 'degraded';
      issues.push(`High database error rate: ${dbErrorRate.toFixed(2)}%`);
    }

    // Check response times
    if (this.metrics.requests.avgResponseTime > 5000) {
      status = 'degraded';
      issues.push(`Slow response time: ${this.metrics.requests.avgResponseTime.toFixed(2)}ms`);
    }

    // Check memory usage
    if (this.metrics.memory.heapUsed > 400) { // 400MB
      status = 'degraded';
      issues.push(`High memory usage: ${this.metrics.memory.heapUsed}MB`);
    }

    return {
      status,
      issues,
      metrics: this.getMetrics()
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0, avgResponseTime: 0 },
      gemini: { calls: 0, success: 0, errors: 0, avgResponseTime: 0, retries: 0 },
      database: { queries: 0, success: 0, errors: 0, avgQueryTime: 0 },
      memory: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0 }
    };
    
    this.responseTimes = [];
    this.geminiResponseTimes = [];
    this.dbQueryTimes = [];
  }
}

// Logger utility
class Logger {
  constructor(service = 'chat-service') {
    this.service = service;
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      service: this.service,
      level,
      message,
      ...meta
    });
  }

  info(message, meta = {}) {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message, meta = {}) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message, meta = {}) {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, meta));
    }
  }
}

// Create singleton instances
const metricsCollector = new MetricsCollector();
const logger = new Logger();

module.exports = {
  MetricsCollector,
  Logger,
  metricsCollector,
  logger
};
