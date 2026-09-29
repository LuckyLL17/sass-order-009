/** 统一的应用错误类型，错误中间件按约定格式输出 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = '请求参数错误', details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = '未登录或登录已失效') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = '无权访问该资源') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = '资源不存在') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message = '资源冲突', details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }
}
