import { getDb } from './index.js';

/** 查询多行，返回普通对象数组 */
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
