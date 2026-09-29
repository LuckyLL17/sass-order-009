import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import toolRoutes from './routes/tools.js';
import subscriptionRoutes from './routes/subscriptions.js';
import userRoutes from './routes/users.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { get } from './db/helpers.js';
import { sendData } from './utils/async-handler.js';

export function createApp() {
  const app = express();

  // CORS：按白名单回显来源，支持携带凭证
  const allowAll = config.corsOrigins.includes('*');
  app.use(
    cors({
      origin(origin, cb) {
        // 同源请求 / curl 等没有 Origin，直接放行
        if (!origin || allowAll || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS 策略不允许来源: ${origin}`));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    })
  );

  app.use(express.json({ limit: '1mb' }));

  // 基础请求日志
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/api/health', (req, res) => {
    let dbOk = true;
    try {
      get('SELECT 1 AS ok');
    } catch {
      dbOk = false;
    }
    sendData(res, { status: 'ok', database: dbOk ? 'connected' : 'error', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tools', toolRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/users', userRoutes);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
