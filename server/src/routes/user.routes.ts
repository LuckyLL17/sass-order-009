import { Router } from 'express';
import { asyncHandler, validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  changePasswordSchema,
  notificationSettingsSchema,
  updateProfileSchema,
} from '../validators/index.js';
import { userService } from '../services/user.service.js';

const router = Router();

router.use(requireAuth);

// GET /api/users/me/profile
router.get(
  '/me/profile',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    // 复用 auth 的 me 数据：直接通过服务取通知设置一并返回
    const settings = userService.getNotificationSettings(userId);
    res.json({ success: true, data: { settings } });
  })
);

// PUT /api/users/me/profile
router.put(
  '/me/profile',
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = userService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: user });
  })
);

// PUT /api/users/me/password
router.put(
  '/me/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await userService.changePassword(
      req.user!.id,
      req.body.oldPassword,
      req.body.newPassword
    );
    res.json({ success: true, data: { message: '密码修改成功' } });
  })
);

// PUT /api/users/me/notification-settings
router.put(
  '/me/notification-settings',
  validate({ body: notificationSettingsSchema }),
  asyncHandler(async (req, res) => {
    const settings = userService.updateNotificationSettings(req.user!.id, req.body);
    res.json({ success: true, data: settings });
  })
);

export default router;
