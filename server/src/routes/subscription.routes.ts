import { Router } from 'express';
import { asyncHandler, validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  autoRenewSchema,
  createSubscriptionSchema,
  idParamSchema,
  renewSubscriptionSchema,
  subscriptionListQuerySchema,
} from '../validators/index.js';
import { subscriptionService } from '../services/subscription.service.js';

const router = Router();

// 以下所有接口均需登录，且服务层按 userId 做资源归属校验
router.use(requireAuth);

// GET /api/subscriptions
router.get(
  '/',
  validate({ query: subscriptionListQuerySchema }),
  asyncHandler(async (req, res) => {
    const { status } = req.validatedQuery as { status?: 'active' | 'expired' | 'cancelled' };
    const data = subscriptionService.list(req.user!.id, status);
    res.json({ success: true, data });
  })
);

// POST /api/subscriptions —— 新增订阅
router.post(
  '/',
  validate({ body: createSubscriptionSchema }),
  asyncHandler(async (req, res) => {
    const data = subscriptionService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

// GET /api/subscriptions/stats —— 账单与支出统计
router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const [bills, monthlySpending, categorySpending] = [
      subscriptionService.bills(userId),
      subscriptionService.monthlySpending(userId),
      subscriptionService.categorySpending(userId),
    ];
    res.json({
      success: true,
      data: { bills, monthlySpending, categorySpending },
    });
  })
);

// POST /api/subscriptions/:id/cancel —— 取消订阅
router.post(
  '/:id/cancel',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const data = subscriptionService.cancel(req.user!.id, req.params.id);
    res.json({ success: true, data });
  })
);

// POST /api/subscriptions/:id/renew —— 续订
router.post(
  '/:id/renew',
  validate({ params: idParamSchema, body: renewSubscriptionSchema }),
  asyncHandler(async (req, res) => {
    const data = subscriptionService.renew(req.user!.id, req.params.id, req.body.period);
    res.json({ success: true, data });
  })
);

// PATCH /api/subscriptions/:id/auto-renew —— 开关自动续费
router.patch(
  '/:id/auto-renew',
  validate({ params: idParamSchema, body: autoRenewSchema }),
  asyncHandler(async (req, res) => {
    const data = subscriptionService.setAutoRenew(
      req.user!.id,
      req.params.id,
      req.body.autoRenew
    );
    res.json({ success: true, data });
  })
);

export default router;
