/**
 * 数据库结构迁移（幂等）。
 * 用法：
 *   node src/db/migrate.js          # 仅建表（已存在则跳过）
 *   node src/db/migrate.js --fresh  # 删除数据库文件后重建
 */
import fs from 'node:fs';
import { initDatabase, getDb, closeDatabase } from './index.js';
import { config } from '../config.js';

const SCHEMA_SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password    TEXT NOT NULL,
  avatar      TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  bio         TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 工具表（市场目录，种子数据，只读维护）
CREATE TABLE IF NOT EXISTS tools (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL,
  logo        TEXT NOT NULL DEFAULT '',
  rating      REAL NOT NULL DEFAULT 0,
  users_count INTEGER NOT NULL DEFAULT 0,
  features    TEXT NOT NULL DEFAULT '[]',
  screenshots TEXT NOT NULL DEFAULT '[]',
  tags        TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 工具订阅方案
CREATE TABLE IF NOT EXISTS plans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id     INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  plan_key    TEXT NOT NULL,
  name        TEXT NOT NULL,
  price       REAL NOT NULL DEFAULT 0,
  period      TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'yearly')),
  features    TEXT NOT NULL DEFAULT '[]',
  recommended INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tool_id, plan_key)
);

-- 用户订阅
CREATE TABLE IF NOT EXISTS subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id     INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  plan_id     INTEGER NOT NULL REFERENCES plans(id),
  plan_name   TEXT NOT NULL,
  price       REAL NOT NULL DEFAULT 0,
  period      TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'yearly')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  auto_renew  INTEGER NOT NULL DEFAULT 1,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 同一用户对同一工具只允许存在一个活跃订阅（防止重复提交/重复订阅）
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_unique
  ON subscriptions(user_id, tool_id)
  WHERE status = 'active';

-- 账单
CREATE TABLE IF NOT EXISTS bills (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date    TEXT NOT NULL,
  amount  REAL NOT NULL DEFAULT 0,
  status  TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
  items   TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 通知偏好（每用户一行）
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id                 INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_notifications     INTEGER NOT NULL DEFAULT 1,
  push_notifications      INTEGER NOT NULL DEFAULT 1,
  subscription_reminders  INTEGER NOT NULL DEFAULT 1,
  marketing_emails        INTEGER NOT NULL DEFAULT 0,
  security_alerts         INTEGER NOT NULL DEFAULT 1,
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 幂等键：防止订阅/续订等写操作被重复提交（双击、网络重试）
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key         TEXT NOT NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  resource_id INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
`;

export async function migrate({ fresh = false } = {}) {
  if (fresh && fs.existsSync(config.databaseFile)) {
    fs.rmSync(config.databaseFile);
    console.log('🗑  已删除旧数据库');
  }
  await initDatabase();
  getDb().run(SCHEMA_SQL);
  const tables = getDb()
    .exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]
    ?.values.map((r) => r[0]);
  console.log('✅ 迁移完成，数据表:', (tables || []).join(', '));
}

// 直接执行时运行
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate({ fresh: process.argv.includes('--fresh') })
    .then(() => closeDatabase())
    .catch((err) => {
      console.error('❌ 迁移失败:', err);
      process.exit(1);
    });
}
