import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.routes.js';
import toolRoutes from './routes/tool.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // CORS：按环境变量配置白名单，开发环境允许 localhost 前端
  app.use(
    cors({
      origin(origin, callback) {
        // 同源/服务端工具请求无 Origin，直接放行
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '1mb' }));

  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', env: config.nodeEnv } });
  });

  // API 文档入口（静态文档见 server/API.md）
  app.get('/api', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'SubHub API',
        version: '1.0.0',
        docs: '/api/docs',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'GET  /api/auth/me',
          'GET  /api/tools',
          'GET  /api/tools/meta',
          'GET  /api/tools/:id',
          'GET  /api/subscriptions',
          'POST /api/subscriptions',
          'POST /api/subscriptions/:id/cancel',
          'POST /api/subscriptions/:id/renew',
          'PATCH /api/subscriptions/:id/auto-renew',
          'GET  /api/subscriptions/stats/summary',
          'GET  /api/users/me/profile',
          'PUT  /api/users/me/profile',
          'PUT  /api/users/me/password',
          'PUT  /api/users/me/notification-settings',
        ],
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tools', toolRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
