import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * sql.js 是编译为 WebAssembly 的 SQLite，数据库运行在内存中，
 * 通过定时 + 写后立即序列化到文件的方式持久化。
 */
let db = null;
let flushTimer = null;
let dirty = false;
let transactionDepth = 0;

export async function initDatabase() {
  const SQL = await initSqlJs();

  const dir = path.dirname(config.databaseFile);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(config.databaseFile)) {
    const buffer = fs.readFileSync(config.databaseFile);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // SQLite 外键约束默认关闭，显式开启
  db.run('PRAGMA foreign_keys = ON;');

  flushTimer = setInterval(() => {
    if (dirty) flush();
  }, config.dbFlushIntervalMs);
  // 进程退出前落盘
  process.on('exit', () => {
    if (dirty) flush();
  });

  return db;
}

/** 立即把内存数据库写入磁盘 */
export function flush() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(config.databaseFile, Buffer.from(data));
  dirty = false;
}

/** 标记数据已变更，触发延迟落盘 */
export function markDirty() {
  dirty = true;
}

export function getDb() {
  if (!db) throw new Error('数据库尚未初始化，请先调用 initDatabase()');
  return db;
}

/** 查询多行 */
export function all(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** 查询单行 */
export function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

/**
 * 执行写操作并落盘。
 * 返回 { lastInsertRowid, changes }。
 * 注意：事务进行中不能调用 export() 落盘（sql.js 的序列化会结束当前事务），
 * 因此事务内仅标记脏页，由 transaction() 在 COMMIT 后统一落盘。
 */
export function run(sql, params = []) {
  getDb().run(sql, params);
  const result = {
    // sql.js 通过 getRowsModified 获取影响行数
    changes: getDb().getRowsModified(),
    lastInsertRowid: lastInsertRowid(sql),
  };
  markDirty();
  if (transactionDepth === 0) flush();
  return result;
}

// sql.js 不直接返回 lastID，单独查询
function lastInsertRowid() {
  const row = get('SELECT last_insert_rowid() AS id');
  return row ? row.id : null;
}

/** 在一个事务里执行回调，异常自动回滚 */
export function transaction(fn) {
  const topLevel = transactionDepth === 0;
  if (topLevel) getDb().run('BEGIN');
  transactionDepth += 1;
  try {
    const result = fn();
    transactionDepth -= 1;
    if (topLevel) {
      getDb().run('COMMIT');
      // COMMIT 成功后再序列化落盘
      markDirty();
      flush();
    }
    return result;
  } catch (err) {
    transactionDepth -= 1;
    if (topLevel) {
      try {
        getDb().run('ROLLBACK');
      } catch {
        /* 事务可能已由数据库自动回滚 */
      }
    }
    throw err;
  }
}

export function closeDatabase() {
  if (flushTimer) clearInterval(flushTimer);
  if (dirty) flush();
  if (db) db.close();
  db = null;
}
