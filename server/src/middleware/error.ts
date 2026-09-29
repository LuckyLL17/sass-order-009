import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

/** 404 兜底 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '接口不存在' },
  });
}

/** 统一错误响应格式：{ success:false, error:{ code,message,details? } } */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  // 唯一约束冲突（如重复注册邮箱、重复活跃订阅）
  if (isSqliteError(err) && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: '数据已存在，请勿重复提交',
      },
    });
  }

  console.error('[unhandled error]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试',
    },
  });
}

function isSqliteError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
