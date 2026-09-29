import { z } from 'zod';
import {
  CATEGORIES,
  PLAN_PERIODS,
  SORT_OPTIONS,
  SUBSCRIPTION_FILTERS,
  SUBSCRIPTION_STATUSES,
  USERS_RANGES,
} from '../enums.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1, '请输入姓名').max(30, '姓名最多 30 个字符'),
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
  password: z
    .string()
    .min(8, '密码长度至少为 8 个字符')
    .max(64, '密码长度不能超过 64 个字符'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, '请输入姓名').max(30).optional(),
    email: z.string().trim().toLowerCase().email('邮箱格式不正确').optional(),
    avatar: z.string().url('头像地址格式不正确').optional(),
    phone: z.string().max(20).optional(),
    location: z.string().max(50).optional(),
    bio: z.string().max(300).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: '至少提交一个待更新字段' });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z.string().min(8, '新密码长度至少为 8 个字符').max(64),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  });

export const notificationSettingsSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    subscriptionReminders: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: '至少提交一项设置' });

export const toolListQuerySchema = z.object({
  category: z.enum([...CATEGORIES, 'all']).optional(),
  search: z.string().trim().max(50).optional(),
  sort: z.enum(SORT_OPTIONS).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  usersRange: z.enum(USERS_RANGES).optional(),
  tags: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((t) => t.trim()).filter(Boolean) : undefined)),
  subscriptionFilter: z.enum(SUBSCRIPTION_FILTERS).optional(),
});

export const idParamSchema = z.object({
  id: z.string().trim().min(1, '缺少资源 ID'),
});

export const createSubscriptionSchema = z.object({
  toolId: z.string().trim().min(1, '请选择工具'),
  planId: z.string().trim().min(1, '请选择订阅方案'),
  period: z.enum(PLAN_PERIODS),
});

export const renewSubscriptionSchema = z.object({
  period: z.enum(PLAN_PERIODS).optional(),
});

export const autoRenewSchema = z.object({
  autoRenew: z.boolean({ message: 'autoRenew 必须为布尔值' }),
});

export const subscriptionListQuerySchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
});
