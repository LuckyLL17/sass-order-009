import { createApp } from './app.js';
import { config } from './config.js';
import { initDatabase, closeDatabase } from './db/index.js';
import { migrate } from './db/migrate.js';

async function bootstrap() {
  // 启动时确保数据库与表结构就绪
  await migrate();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`
🚀 SubHub API 已启动
   本地地址:  http://localhost:${config.port}
   健康检查:  http://localhost:${config.port}/api/health
   CORS 来源: ${config.corsOrigins.join(', ')}
`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} 收到，正在关闭服务...`);
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('服务启动失败:', err);
  process.exit(1);
});
