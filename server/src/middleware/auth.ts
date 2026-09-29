import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
import { userRepository } from '../repositories/user.repository.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// 扩展 Express Request，挂载当前登录用户
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: { id: string }): string {
  return jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  // 兼容 query 传参（如发票下载场景），优先使用 header
  const queryToken = req.query.token;
  return typeof queryToken === 'string' ? queryToken : undefined;
}

/** 必须登录：解析并校验 JWT，将用户挂到 req.user */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw AppError.unauthorized('请先登录');
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    } catch {
      throw AppError.unauthorized('登录状态已失效，请重新登录');
    }

    const user = payload.sub ? userRepository.findById(payload.sub) : undefined;
    if (!user) {
      throw AppError.unauthorized('用户不存在或已被删除');
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

/** 可选鉴权：已登录则挂载 req.user（用于公开接口按用户返回订阅状态） */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (payload.sub) {
      const user = userRepository.findById(payload.sub);
      if (user) {
        req.user = { id: user.id, email: user.email, name: user.name };
      }
    }
  } catch {
    // 可选鉴权下忽略无效 token
  }
  next();
}
