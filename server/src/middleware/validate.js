import { ZodError } from 'zod';
import { validationError } from '../utils/errors.js';

/**
 * 用 zod schema 校验请求体/查询参数。
 * 校验通过后用解析结果替换 req.body / req.query（完成类型转换与默认值填充）。
 */
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    try {
      const result = schema.parse(req[source]);
      // query 是只读 getter 集，使用 defineProperty 覆盖
      if (source === 'query') {
        req[source] = result;
      } else {
        req[source] = result;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors
          ? err.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            }))
          : err.issues.map((e) => ({ field: e.path.join('.'), message: e.message }));
        return next(validationError(details));
      }
      next(err);
    }
  };
