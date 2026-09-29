import { createApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { runMigrations } from './db/migrate.js';

function bootstrap() {
  // 启动时自动执行迁移（已执行的版本会跳过）
  runMigrations(false);
  // 提前建立连接，配置问题（如文件权限）在启动期暴露
  getDb();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`\n🚀 SubHub API 已启动: http://localhost:${config.port}`);
    console.log(`   健康检查: http://localhost:${config.port}/health`);
    console.log(`   接口目录: http://localhost:${config.port}/api`);
  });
}

bootstrap();
