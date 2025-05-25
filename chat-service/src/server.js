const cluster = require('cluster');
const os = require('os');
const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3004;

// Tối ưu cluster mode cho container
// Sử dụng ít workers hơn để tránh overhead
const numCPUs = Math.min(os.cpus().length, 2); // Giới hạn tối đa 2 workers
const WORKERS = process.env.CLUSTER_WORKERS || numCPUs;

if (cluster.isMaster) {
  console.log(`🚀 Master process ${process.pid} starting...`);
  console.log(`📊 CPU cores: ${os.cpus().length}, Using workers: ${WORKERS}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Fork workers
  for (let i = 0; i < WORKERS; i++) {
    const worker = cluster.fork();
    console.log(`👷 Worker ${worker.process.pid} started`);
  }

  // Handle worker crashes với exponential backoff
  let restartCount = 0;
  cluster.on('exit', (worker, code, signal) => {
    console.log(`💥 Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);

    // Exponential backoff để tránh restart loop
    const delay = Math.min(1000 * Math.pow(2, restartCount), 30000);
    restartCount++;

    setTimeout(() => {
      console.log(`🔄 Restarting worker after ${delay}ms delay...`);
      const newWorker = cluster.fork();
      console.log(`👷 New worker ${newWorker.process.pid} started`);

      // Reset restart count sau khi worker chạy ổn định 1 phút
      setTimeout(() => {
        restartCount = Math.max(0, restartCount - 1);
      }, 60000);
    }, delay);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📴 Master received SIGTERM, shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  // Log cluster stats mỗi 5 phút
  setInterval(() => {
    const workers = Object.keys(cluster.workers).length;
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`📊 Cluster stats - Workers: ${workers}, Master memory: ${memory}MB`);
  }, 5 * 60 * 1000);

} else {
  // Worker process
  const server = app.listen(PORT, '0.0.0.0', () => {
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`👷 Worker ${process.pid} listening on port ${PORT} (${memory}MB)`);
  });

  // Graceful shutdown cho worker
  process.on('SIGTERM', () => {
    console.log(`📴 Worker ${process.pid} received SIGTERM, closing server...`);
    server.close(() => {
      console.log(`✅ Worker ${process.pid} closed gracefully`);
      process.exit(0);
    });
  });

  // Handle worker errors
  process.on('uncaughtException', (err) => {
    console.error(`💥 Worker ${process.pid} uncaught exception:`, err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`💥 Worker ${process.pid} unhandled rejection at:`, promise, 'reason:', reason);
    process.exit(1);
  });
}
