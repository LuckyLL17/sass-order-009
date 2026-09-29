/** 包装异步路由，异常自动转交错误处理中间件 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** 统一成功响应 */
export const sendData = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });
