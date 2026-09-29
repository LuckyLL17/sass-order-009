import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { run } from '../db/index.js';
import { get } from '../db/helpers.js';
import { asyncHandler, sendData } from '../utils/async-handler.js';
import { unauthorized, conflict } from '../utils/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import { serializeUser } from '../utils/serializers.js';
import { DEFAULT_AVATAR } from '../db/seed-data.js';

const router = Router();

function authPayload(user) {
  return { token: signToken(user), user: serializeUser(user) };
}

/** POST /api/auth/register —— 用户注册（邮箱唯一，防止重复注册） */
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existing = get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw conflict('该邮箱已注册，请直接登录');

    const hash = await bcrypt.hash(password, 10);
    const info = run(
      'INSERT INTO users (name, email, password, avatar) VALUES (?, ?, ?, ?)',
      [name, email, hash, DEFAULT_AVATAR]
    );
    const user = get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
    run('INSERT OR IGNORE INTO notification_settings (user_id) VALUES (?)', [user.id]);

    res.status(201);
    sendData(res, authPayload(user), 201);
  })
);

/** POST /api/auth/login —— 用户登录 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) throw unauthorized('邮箱或密码不正确');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw unauthorized('邮箱或密码不正确');

    sendData(res, authPayload(user));
  })
);

/** GET /api/auth/me —— 获取当前登录用户（刷新页面后恢复会话） */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    sendData(res, serializeUser(req.user));
  })
);

export default router;
