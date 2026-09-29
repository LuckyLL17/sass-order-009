import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { get } from '../db/helpers.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/** 必须携带有效 Bearer Token，并把 user 挂到 req.user */
export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw unauthorized('登录状态无效或已过期，请重新登录');
    }

    const user = get('SELECT * FROM users WHERE id = ?', [Number(payload.sub)]);
    if (!user) throw unauthorized('用户不存在或已被注销');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** 可选鉴权：有 token 就解析，没有也放行（用于公开接口附带个性化信息） */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = get('SELECT * FROM users WHERE id = ?', [Number(payload.sub)]);
      if (user) req.user = user;
    } catch {
      /* 忽略无效 token，按匿名处理 */
    }
  }
  next();
}

/** 资源归属校验：确认某条数据属于当前登录用户 */
export function assertOwned(resourceUserId, currentUser, message = '无权操作该资源') {
  if (Number(resourceUserId) !== Number(currentUser.id)) {
    throw forbidden(message);
  }
}
