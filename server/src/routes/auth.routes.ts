import { Router } from 'express';
import { asyncHandler, validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/index.js';
import { authService } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  })
);

// GET /api/auth/me —— 刷新页面后凭 token 恢复登录态
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = authService.me(req.user!.id);
    res.json({ success: true, data: { user } });
  })
);

export default router;
