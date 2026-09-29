/**
 * 统一错误类型。所有业务错误通过 ApiError 抛出，
 * 由错误处理中间件格式化为统一响应：
 * { success: false, error: { code, message, details? } }
 */
export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message = '请求参数错误', details) =>
  new ApiError(400, 'BAD_REQUEST', message, details);

export const validationError = (details, message = '参数校验失败') =>
  new ApiError(422, 'VALIDATION_ERROR', message, details);

export const unauthorized = (message = '未登录或登录已过期') =>
  new ApiError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = '无权访问该资源') =>
  new ApiError(403, 'FORBIDDEN', message);

export const notFound = (message = '资源不存在') =>
  new ApiError(404, 'NOT_FOUND', message);

export const conflict = (message = '资源冲突') =>
  new ApiError(409, 'CONFLICT', message);
