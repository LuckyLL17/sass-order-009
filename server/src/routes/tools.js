import { Router } from 'express';
import { all, get } from '../db/helpers.js';
import { asyncHandler, sendData } from '../utils/async-handler.js';
import { notFound } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { listToolsQuerySchema } from '../validators/schemas.js';
import { serializeTool, serializePlan } from '../utils/serializers.js';

export const categoriesMeta = [
  { id: 'design', name: '设计工具', icon: 'Palette', color: 'from-pink-500 to-rose-500' },
  { id: 'development', name: '开发工具', icon: 'Code2', color: 'from-blue-500 to-cyan-500' },
  { id: 'marketing', name: '营销工具', icon: 'TrendingUp', color: 'from-amber-500 to-orange-500' },
  { id: 'collaboration', name: '协作工具', icon: 'Users', color: 'from-green-500 to-emerald-500' },
];

const router = Router();

/** 读取全部工具（含方案、最低价），筛选逻辑统一在内存中完成以保证与前端口径一致 */
function loadTools() {
  const rows = all('SELECT * FROM tools ORDER BY sort_order, id');
  const planRows = all('SELECT * FROM plans ORDER BY price');
  const plansByTool = new Map();
  for (const p of planRows) {
    if (!plansByTool.has(p.tool_id)) plansByTool.set(p.tool_id, []);
    plansByTool.get(p.tool_id).push(serializePlan(p));
  }
  return rows.map((row) => {
    const plans = plansByTool.get(row.id) || [];
    return { ...serializeTool(row, plans), minPrice: Math.min(...plans.map((p) => p.price)) };
  });
}

/** GET /api/tools/meta —— 分类、标签、价格区间、总数 */
router.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const tools = loadTools();
    const tagSet = new Set();
    tools.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    const categoryCounts = Object.fromEntries(categoriesMeta.map((c) => [c.id, 0]));
    tools.forEach((t) => {
      if (categoryCounts[t.category] !== undefined) categoryCounts[t.category] += 1;
    });
    sendData(res, {
      categories: categoriesMeta.map((c) => ({ ...c, count: categoryCounts[c.id] })),
      tags: Array.from(tagSet).sort(),
      priceRange: {
        min: tools.length ? Math.min(...tools.map((t) => t.minPrice)) : 0,
        max: tools.length ? Math.max(...tools.map((t) => t.minPrice)) : 0,
      },
      total: tools.length,
    });
  })
);

/** GET /api/tools —— 工具查询 / 筛选 / 排序（支持登录用户按订阅状态过滤） */
router.get(
  '/',
  optionalAuth,
  validate(listToolsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query;
    let tools = loadTools();

    // 当前用户订阅状态（按 toolId 索引）
    let subByTool = new Map();
    if (req.user) {
      const subs = all('SELECT tool_id, status FROM subscriptions WHERE user_id = ?', [req.user.id]);
      subByTool = new Map(subs.map((s) => [s.tool_id, s.status]));
    }

    if (q.category) tools = tools.filter((t) => t.category === q.category);

    if (q.q) {
      const kw = q.q.toLowerCase();
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.description.toLowerCase().includes(kw) ||
          t.tags.some((tag) => tag.toLowerCase().includes(kw))
      );
    }

    if (q.tags?.length) {
      tools = tools.filter((t) => q.tags.every((tag) => t.tags.includes(tag)));
    }
    if (q.tag) tools = tools.filter((t) => t.tags.includes(q.tag));

    if (q.priceMin !== undefined) tools = tools.filter((t) => t.minPrice >= q.priceMin);
    if (q.priceMax !== undefined) tools = tools.filter((t) => t.minPrice <= q.priceMax);
    if (q.ratingMin !== undefined) tools = tools.filter((t) => t.rating >= q.ratingMin);

    switch (q.usersRange) {
      case 'lt-10k':
        tools = tools.filter((t) => t.usersCount < 10000);
        break;
      case '10k-50k':
        tools = tools.filter((t) => t.usersCount >= 10000 && t.usersCount < 50000);
        break;
      case '50k-100k':
        tools = tools.filter((t) => t.usersCount >= 50000 && t.usersCount < 100000);
        break;
      case 'gt-100k':
        tools = tools.filter((t) => t.usersCount >= 100000);
        break;
    }

    if (req.user && q.subscription !== 'all') {
      tools = tools.filter((t) => {
        const status = subByTool.get(Number(t.id));
        if (q.subscription === 'subscribed') return status === 'active';
        if (q.subscription === 'not-subscribed') return status !== 'active';
        if (q.subscription === 'expired') return status === 'expired';
        return true;
      });
    }

    switch (q.sort) {
      case 'rating':
        tools.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        tools.sort((a, b) => a.minPrice - b.minPrice);
        break;
      case 'price-high':
        tools.sort((a, b) => b.minPrice - a.minPrice);
        break;
      case 'newest':
        tools.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      case 'users-asc':
        tools.sort((a, b) => a.usersCount - b.usersCount);
        break;
      case 'users-desc':
      case 'popular':
      default:
        tools.sort((a, b) => b.usersCount - a.usersCount);
    }

    // 附带当前用户对该工具的订阅标记，便于前端展示
    const data = tools.map(({ minPrice, ...t }) => ({
      ...t,
      mySubscriptionStatus: req.user ? subByTool.get(Number(t.id)) || null : null,
    }));

    sendData(res, { items: data, total: data.length });
  })
);

/** GET /api/tools/:id —— 工具详情（含相关工具） */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw notFound('工具不存在');

    const row = get('SELECT * FROM tools WHERE id = ?', [id]);
    if (!row) throw notFound('工具不存在');

    const tool = serializeTool(row);
    const relatedRows = all(
      'SELECT * FROM tools WHERE category = ? AND id != ? ORDER BY sort_order LIMIT 3',
      [row.category, id]
    );
    const related = relatedRows.map((r) => serializeTool(r));

    let mySubscription = null;
    if (req.user) {
      const sub = get('SELECT * FROM subscriptions WHERE user_id = ? AND tool_id = ?', [
        req.user.id,
        id,
      ]);
      mySubscription = sub
        ? { id: String(sub.id), status: sub.status, autoRenew: !!sub.auto_renew }
        : null;
    }

    sendData(res, { tool, related, mySubscription });
  })
);

export default router;
