import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { run } from '../db/index.js';
import { get } from '../db/helpers.js';
import { asyncHandler, sendData } from '../utils/async-handler.js';
import { conflict, unauthorized } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  notificationSchema,
} from '../validators/schemas.js';
import { serializeUser } from '../utils/serializers.js';

const router = Router();

router.use(requireAuth);

const NOTIFICATION_FIELDS = {
  emailNotifications: 'email_notifications',
  pushNotifications: 'push_notifications',
  subscriptionReminders: 'subscription_reminders',
  marketingEmails: 'marketing_emails',
  securityAlerts: 'security_alerts',
};

function loadSettings(userId) {
  const row = get('SELECT * FROM notification_settings WHERE user_id = ?', [userId]);
  if (!row) return null;
  return {
    emailNotifications: !!row.email_notifications,
    pushNotifications: !!row.push_notifications,
    subscriptionReminders: !!row.subscription_reminders,
    marketingEmails: !!row.marketing_emails,
    securityAlerts: !!row.security_alerts,
  };
}

/** GET /api/users/me —— 个人资料 + 通知偏好 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    sendData(res, {
      ...serializeUser(req.user),
      notificationSettings: loadSettings(req.user.id),
    });
  })
);

/** PATCH /api/users/me —— 更新个人资料 */
router.patch(
  '/me',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const fields = ['name', 'email', 'phone', 'location', 'bio', 'avatar'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }

    if (req.body.email && req.body.email !== req.user.email.toLowerCase()) {
      const dup = get('SELECT id FROM users WHERE email = ? AND id != ?', [
        req.body.email,
        req.user.id,
      ]);
      if (dup) throw conflict('该邮箱已被其他账户使用');
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);
    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    sendData(res, serializeUser(user));
  })
);

/** POST /api/users/me/change-password —— 修改密码 */
router.post(
  '/me/change-password',
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const ok = await bcrypt.compare(oldPassword, req.user.password);
    if (!ok) throw unauthorized('当前密码不正确');

    const hash = await bcrypt.hash(newPassword, 10);
    run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [
      hash,
      req.user.id,
    ]);
    sendData(res, { message: '密码修改成功' });
  })
);

/** GET /api/users/me/notifications */
router.get(
  '/me/notifications',
  asyncHandler(async (req, res) => {
    let settings = loadSettings(req.user.id);
    if (!settings) {
      run('INSERT INTO notification_settings (user_id) VALUES (?)', [req.user.id]);
      settings = loadSettings(req.user.id);
    }
    sendData(res, settings);
  })
);

/** PUT /api/users/me/notifications —— 增量更新通知偏好 */
router.put(
  '/me/notifications',
  validate(notificationSchema),
  asyncHandler(async (req, res) => {
    run('INSERT OR IGNORE INTO notification_settings (user_id) VALUES (?)', [req.user.id]);

    const sets = [];
    const params = [];
    for (const [apiKey, column] of Object.entries(NOTIFICATION_FIELDS)) {
      if (req.body[apiKey] !== undefined) {
        sets.push(`${column} = ?`);
        params.push(req.body[apiKey] ? 1 : 0);
      }
    }
    sets.push("updated_at = datetime('now')");
    params.push(req.user.id);
    run(`UPDATE notification_settings SET ${sets.join(', ')} WHERE user_id = ?`, params);

    sendData(res, loadSettings(req.user.id));
  })
);

export default router;
