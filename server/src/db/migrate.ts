/**
 * 数据库迁移：以迁移记录（schema_migrations）保证每个版本只执行一次。
 * 新增结构变更时，在 migrations 数组尾部追加新版本即可。
 */
import { getDb } from './index.js';

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: /* sql */ `
      CREATE TABLE users (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        avatar      TEXT NOT NULL DEFAULT '',
        phone       TEXT NOT NULL DEFAULT '',
        location    TEXT NOT NULL DEFAULT '',
        bio         TEXT NOT NULL DEFAULT '',
        settings    TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE tools (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category    TEXT NOT NULL,
        logo        TEXT NOT NULL DEFAULT '',
        rating      REAL NOT NULL DEFAULT 0,
        users_count INTEGER NOT NULL DEFAULT 0,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE tool_features (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE tool_screenshots (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id  TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        url      TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE tool_tags (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        tag     TEXT NOT NULL
      );

      CREATE TABLE plans (
        id          TEXT PRIMARY KEY,
        tool_id     TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        price       REAL NOT NULL DEFAULT 0,
        period      TEXT NOT NULL DEFAULT 'monthly',
        recommended INTEGER NOT NULL DEFAULT 0,
        position    INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE plan_features (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id  TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        content  TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE subscriptions (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tool_id      TEXT NOT NULL REFERENCES tools(id) ON DELETE RESTRICT,
        plan_id      TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        plan_name    TEXT NOT NULL,
        price        REAL NOT NULL,
        period       TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'active',
        auto_renew   INTEGER NOT NULL DEFAULT 1,
        start_date   TEXT NOT NULL,
        end_date     TEXT NOT NULL,
        cancelled_at TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- 同一用户对同一工具只能持有一份「活跃」订阅，防止重复提交
      CREATE UNIQUE INDEX idx_subscriptions_unique_active
        ON subscriptions(user_id, tool_id)
        WHERE status = 'active';

      CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

      CREATE TABLE bills (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        amount          REAL NOT NULL,
        status          TEXT NOT NULL DEFAULT 'paid',
        bill_date       TEXT NOT NULL,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE bill_items (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id   TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        name      TEXT NOT NULL,
        quantity  INTEGER NOT NULL DEFAULT 1,
        price     REAL NOT NULL
      );

      CREATE INDEX idx_bills_user ON bills(user_id);
    `,
  },
];

export function runMigrations(reset = false) {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name    TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (reset) {
    // 按依赖反序关闭外键后清空全部业务表
    db.pragma('foreign_keys = OFF');
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'`
      )
      .all() as { name: string }[];
    for (const { name } of tables) {
      db.exec(`DROP TABLE IF EXISTS ${name}`);
    }
    db.exec(`DELETE FROM schema_migrations`);
    db.pragma('foreign_keys = ON');
  }

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
      (r) => r.version
    )
  );

  for (const migration of migrations.sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) continue;
    const tx = db.transaction(() => {
      db.exec(migration.up);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name
      );
    });
    tx();
    console.log(`✓ 已执行迁移 v${migration.version}: ${migration.name}`);
  }
}

// 允许通过 `tsx src/db/migrate.ts --reset` 直接执行
if (import.meta.url === `file://${process.argv[1]}`) {
  const reset = process.argv.includes('--reset');
  runMigrations(reset);
  console.log(reset ? '数据库已重置并完成迁移' : '迁移完成');
}
