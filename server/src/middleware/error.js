import { ApiError } from '../utils/errors.js';

/** 404 兜底 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `接口不存在: ${req.method} ${req.path}`,
    },
  });
}

/** 统一错误处理（必须保留 4 个参数 Express 才能识别） */
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    const body = { success: false, error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  // SQLite UNIQUE 约束冲突
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: '数据已存在，请勿重复提交' },
    });
  }

  console.error('[未处理错误]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
}
