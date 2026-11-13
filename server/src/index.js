import app from './app.js';
import config from './config/index.js';

const server = app.listen(config.PORT, () => {
  console.log(`[EthAum Server] Running on port ${config.PORT} in ${config.NODE_ENV} mode`);
  console.log(`[EthAum Server] Health check available at http://localhost:${config.PORT}/api/health`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('[EthAum Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[EthAum Server] Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
