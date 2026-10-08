import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns/promises';
import { PORT } from './backend/config/env.ts';
import { connectDB } from './backend/config/db.ts';
import { i18nMiddleware, initBackendI18n } from './backend/i18n.ts';
import { globalTokenBucket } from './backend/middlewares/rateLimiter.ts';
import { errorHandler } from './backend/middlewares/errorHandler.ts';
import apiRouter from './backend/routes/index.ts';

try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  // Ignore DNS configuration errors in restricted containers
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await initBackendI18n();

  const app = express();
  const httpServer = http.createServer(app);

  // Basic Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // i18n Middleware (Language negotiation & req.t setup)
  app.use(i18nMiddleware);

  // Global Token Bucket Rate Limiter
  app.use('/api', globalTokenBucket);

  // Modular API Routes
  app.use('/api', apiRouter);

  // Public Assets
  app.use(express.static(path.resolve(__dirname, 'public')));

  // Vite Development Middleware / Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Centralized Error Handling
  app.use(errorHandler);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KasirWarung server running on http://localhost:${PORT}`);
  });

  // Connect and seed database asynchronously so port 3000 binds immediately
  connectDB().catch((err) => {
    console.warn('Database initialization warning:', err);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
