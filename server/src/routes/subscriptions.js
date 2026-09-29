/**
 * 订阅相关路由
 * - 全部接口需要登录，并在操作前做资源归属校验（user_id 匹配）
 * - 创建/续订支持幂等键，防止重复提交
 * - 数据库层通过 (user_id, tool_id) 部分唯一索引保证同一工具只能有一个活跃订阅
 */
import { Router } from 'express';
import { run, transaction } from '../db/index.js';
import { all, get } from '../db/helpers.js';
import { asyncHandler, sendData } from '../utils/async-handler.js';
import { notFound, conflict, badRequest } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSubscriptionSchema,
  renewSubscriptionSchema,
  updateSubscriptionSchema,
} from '../validators/schemas.js';
import { serializeSubscription, serializeBill } from '../utils/serializers.js';

const router = Router();
router.use(requireAuth);

const dayMs = 24 * 60 * 60 * 1000;
const fmt = (d) => d.toISOString().split('T')[0];

/** 年付价格：月价 × 12 × 0.8（与前端“年付省 20%”口径一致） */
function priceForPeriod(monthlyPrice, period) {
  return period === 'yearly' ? Math.round(monthlyPrice * 12 * 0.8) : monthlyPrice;
}
function daysForPeriod(period) {
  return period === 'yearly' ? 365 : 30;
}
/** 账单条目展示名：工具名已包含方案名时不再拼接 */
function planDisplayName(toolName, planName) {
  return toolName.includes(planName) ? toolName : `${toolName} ${planName}`;
}

/** 查询订阅并校验归属 */
function getOwnedSubscription(id, userId) {
  const sub = get('SELECT * FROM subscriptions WHERE id = ?', [id]);
  if (!sub || sub.user_id !== userId) throw notFound('订阅不存在');
  return sub;
}

/** 查询已缓存的幂等结果 */
function findIdempotent(key, userId) {
  if (!key) return null;
  return get('SELECT resource_id FROM idempotency_keys WHERE key = ? AND user_id = ?', [
    key,
    userId,
  ]);
}

/** 读取订阅（连带工具信息） */
function loadSubscription(id) {
  const row = get(
    `SELECT s.*, t.name AS tool_name, t.logo AS tool_logo
     FROM subscriptions s JOIN tools t ON t.id = s.tool_id
     WHERE s.id = ?`,
    [id]
  );
  return row ? serializeSubscription(row) : null;
}

/** GET /api/subscriptions —— 我的订阅（可按 status 过滤） */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const allowed = ['active', 'expired', 'cancelled'];
    if (status && !allowed.includes(status)) throw badRequest('非法的状态筛选值');

    const sql = `
      SELECT s.*, t.name AS tool_name, t.logo AS tool_logo
      FROM subscriptions s
      JOIN tools t ON t.id = s.tool_id
      WHERE s.user_id = ? ${status ? 'AND s.status = ?' : ''}
      ORDER BY s.created_at DESC, s.id DESC`;
    const params = status ? [req.user.id, status] : [req.user.id];
    const rows = all(sql, params);
    sendData(res, rows.map(serializeSubscription));
  })
);

/** POST /api/subscriptions —— 新增订阅（防重复提交、防重复订阅） */
router.post(
  '/',
  validate(createSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const { planId, period, idempotencyKey } = req.body;
    const userId = req.user.id;

    // 1. 幂等命中：同一 key 直接返回首次创建的订阅
    const cached = findIdempotent(idempotencyKey, userId);
    if (cached?.resource_id) {
      return sendData(res, loadSubscription(cached.resource_id), 200);
    }

    const plan = get('SELECT * FROM plans WHERE id = ?', [planId]);
    if (!plan) throw notFound('订阅方案不存在');
    const tool = get('SELECT * FROM tools WHERE id = ?', [plan.tool_id]);
    if (!tool) throw notFound('工具不存在');

    // 2. 业务校验：同一工具不能有两个活跃订阅
    const active = get(
      `SELECT id FROM subscriptions
       WHERE user_id = ? AND tool_id = ? AND status = 'active'`,
      [userId, tool.id]
    );
    if (active) throw conflict(`您已订阅 ${tool.name}，请勿重复订阅`);

    const price = priceForPeriod(plan.price, period);
    const start = new Date();
    const end = new Date(start.getTime() + daysForPeriod(period) * dayMs);

    let subId;
    transaction(() => {
      const info = run(
        `INSERT INTO subscriptions
           (user_id, tool_id, plan_id, plan_name, price, period, status, auto_renew, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)`,
        [userId, tool.id, plan.id, plan.name, price, period, fmt(start), fmt(end)]
      );
      subId = info.lastInsertRowid;

      // 生成一条已支付账单
      run('INSERT INTO bills (user_id, date, amount, status, items) VALUES (?, ?, ?, \'paid\', ?)', [
        userId,
        fmt(start),
        price,
        JSON.stringify([{ toolId: String(tool.id), name: planDisplayName(tool.name, plan.name), quantity: 1, price }]),
      ]);

      if (idempotencyKey) {
        run(
          'INSERT OR IGNORE INTO idempotency_keys (key, user_id, action, resource_id) VALUES (?, ?, \'subscribe\', ?)',
          [idempotencyKey, userId, subId]
        );
      }
    });

    sendData(res, loadSubscription(subId), 201);
  })
);

/** PATCH /api/subscriptions/:id/auto-renew —— 开关自动续费 */
router.patch(
  '/:id/auto-renew',
  validate(updateSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const sub = getOwnedSubscription(Number(req.params.id), req.user.id);
    run('UPDATE subscriptions SET auto_renew = ?, updated_at = datetime(\'now\') WHERE id = ?', [
      req.body.autoRenew ? 1 : 0,
      sub.id,
    ]);
    sendData(res, loadSubscription(sub.id));
  })
);

/** POST /api/subscriptions/:id/cancel —— 取消订阅（归属校验 + 重复取消保护） */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const sub = getOwnedSubscription(Number(req.params.id), req.user.id);
    if (sub.status !== 'active') throw conflict('该订阅当前不可取消');

    run(
      `UPDATE subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = datetime('now')
       WHERE id = ?`,
      [sub.id]
    );
    sendData(res, loadSubscription(sub.id));
  })
);

/** POST /api/subscriptions/:id/renew —— 续订（已取消/过期 -> 活跃；活跃订阅幂等返回） */
router.post(
  '/:id/renew',
  validate(renewSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const subId = Number(req.params.id);
    const { period, idempotencyKey } = req.body;
    const userId = req.user.id;

    const cached = findIdempotent(idempotencyKey, userId);
    if (cached?.resource_id) {
      return sendData(res, loadSubscription(cached.resource_id), 200);
    }

    const sub = getOwnedSubscription(subId, userId);
    if (sub.status === 'active') throw conflict('该订阅仍在有效期内，无需续订');

    const plan = get('SELECT * FROM plans WHERE id = ?', [sub.plan_id]);
    if (!plan) throw notFound('原订阅方案已下架，无法续订');
    const tool = get('SELECT * FROM tools WHERE id = ?', [sub.tool_id]);
    const price = priceForPeriod(plan.price, period);
    const start = new Date();
    const end = new Date(start.getTime() + daysForPeriod(period) * dayMs);

    transaction(() => {
      run(
        `UPDATE subscriptions
         SET status = 'active', auto_renew = 1, period = ?, price = ?,
             plan_name = ?, start_date = ?, end_date = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [period, price, plan.name, fmt(start), fmt(end), subId]
      );
      run('INSERT INTO bills (user_id, date, amount, status, items) VALUES (?, ?, ?, \'paid\', ?)', [
        userId,
        fmt(start),
        price,
        JSON.stringify([{ toolId: String(tool.id), name: `${planDisplayName(tool.name, plan.name)}（续订）`, quantity: 1, price }]),
      ]);
      if (idempotencyKey) {
        run(
          'INSERT OR IGNORE INTO idempotency_keys (key, user_id, action, resource_id) VALUES (?, ?, \'renew\', ?)',
          [idempotencyKey, userId, subId]
        );
      }
    });

    sendData(res, loadSubscription(subId));
  })
);

/** GET /api/subscriptions/bills —— 账单历史 */
router.get(
  '/bills',
  asyncHandler(async (req, res) => {
    const rows = all(
      'SELECT * FROM bills WHERE user_id = ? ORDER BY date DESC, id DESC',
      [req.user.id]
    );
    sendData(res, rows.map(serializeBill));
  })
);

/** GET /api/subscriptions/stats —— 月度支出趋势 + 分类占比（基于近 6 个月账单） */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const bills = all(
      `SELECT date, amount, items FROM bills
       WHERE user_id = ? AND date >= date('now', '-6 months')
       ORDER BY date ASC`,
      [req.user.id]
    );

    const monthLabels = {};
    const monthlyMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, 0);
      monthLabels[key] = `${d.getMonth() + 1}月`;
    }

    const categoryMap = new Map();
    for (const bill of bills) {
      const key = bill.date.slice(0, 7);
      if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) || 0) + bill.amount);
      try {
        for (const item of JSON.parse(bill.items || '[]')) {
          // 优先用账单条目携带的 toolId 归类，其次按名称回退匹配
          let tool =
            (item.toolId && get('SELECT id, category FROM tools WHERE id = ?', [Number(item.toolId)])) ||
            null;
          if (!tool) {
            const toolName = String(item.name || '').replace('（续订）', '').split(' ')[0];
            tool = get('SELECT id, category FROM tools WHERE name = ?', [toolName]);
          }
          if (tool) {
            const labelMap = {
              design: '设计工具',
              development: '开发工具',
              marketing: '营销工具',
              collaboration: '协作工具',
            };
            const label = labelMap[tool.category] || tool.category;
            categoryMap.set(label, (categoryMap.get(label) || 0) + item.price * (item.quantity || 1));
          }
        }
      } catch {
        /* 忽略损坏的账单条目 */
      }
    }

    const monthlySpending = Array.from(monthlyMap.entries()).map(([key, amount]) => ({
      month: monthLabels[key],
      amount,
    }));
    const categorySpending = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

    sendData(res, { monthlySpending, categorySpending });
  })
);

export default router;
