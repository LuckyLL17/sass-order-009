import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, '姓名不能为空').max(30, '姓名最长 30 个字符'),
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .max(64, '密码最长 64 个字符')
    .regex(/[a-zA-Z]/, '密码需包含字母')
    .regex(/\d/, '密码需包含数字'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, '姓名不能为空').max(30).optional(),
    email: z.string().trim().toLowerCase().email('邮箱格式不正确').optional(),
    phone: z.string().trim().max(20).optional(),
    location: z.string().trim().max(50).optional(),
    bio: z.string().trim().max(300).optional(),
    avatar: z.string().url('头像地址格式不正确').max(500).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: '至少提交一个待更新字段' });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z
      .string()
      .min(8, '新密码至少 8 个字符')
      .max(64)
      .regex(/[a-zA-Z]/, '新密码需包含字母')
      .regex(/\d/, '新密码需包含数字'),
  })
  .refine((d) => d.oldPassword !== d.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  });

export const notificationSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    subscriptionReminders: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: '至少提交一个设置项' });

const periodEnum = z.enum(['monthly', 'yearly']);

export const createSubscriptionSchema = z.object({
  planId: z.union([z.string(), z.number()]).transform(Number),
  period: periodEnum.default('monthly'),
  // 幂等键：前端为一次订阅动作生成唯一值，防止重复提交
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
});

export const renewSubscriptionSchema = z.object({
  period: periodEnum.default('monthly'),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
});

export const updateSubscriptionSchema = z.object({
  autoRenew: z.boolean(),
});

const sortEnum = z.enum([
  'popular',
  'rating',
  'price-low',
  'price-high',
  'newest',
  'users-desc',
  'users-asc',
]);
const categoryEnum = z.enum(['design', 'development', 'marketing', 'collaboration']);
const usersRangeEnum = z.enum(['all', 'lt-10k', '10k-50k', '50k-100k', 'gt-100k']);
const subscriptionFilterEnum = z.enum(['all', 'subscribed', 'not-subscribed', 'expired']);

const toNumber = (v) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

export const listToolsQuerySchema = z.object({
  category: categoryEnum.optional(),
  q: z.string().trim().max(60).optional(),
  tag: z.string().trim().max(20).optional(),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  sort: sortEnum.default('popular'),
  priceMin: z.preprocess(toNumber, z.number().min(0).max(100000).optional()),
  priceMax: z.preprocess(toNumber, z.number().min(0).max(100000).optional()),
  ratingMin: z.preprocess(toNumber, z.number().min(0).max(5).optional()),
  usersRange: usersRangeEnum.default('all'),
  subscription: subscriptionFilterEnum.default('all'),
});
