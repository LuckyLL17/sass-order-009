import { apiClient } from './client';
import type {
  User,
  Tool,
  UserSubscription,
  Bill,
  MonthlySpending,
  CategorySpending,
  Category,
  SortOption,
  SubscriptionFilter,
  UsersRange,
} from '@/types';

/* ---------------- 鉴权 ---------------- */

export interface AuthResult {
  token: string;
  user: User;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  subscriptionReminders: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

export interface UserProfile extends User {
  phone?: string;
  location?: string;
  bio?: string;
  notificationSettings?: NotificationSettings | null;
}

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) =>
    apiClient.post<unknown, AuthResult>('/auth/register', payload),
  login: (payload: { email: string; password: string }) =>
    apiClient.post<unknown, AuthResult>('/auth/login', payload),
  me: () => apiClient.get<unknown, UserProfile>('/auth/me'),
};

/* ---------------- 工具市场 ---------------- */

export interface CategoryMeta {
  id: Category;
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface ToolsMeta {
  categories: CategoryMeta[];
  tags: string[];
  priceRange: { min: number; max: number };
  total: number;
}

export interface ToolListParams {
  category?: Category | 'all';
  q?: string;
  tags?: string[];
  sort?: SortOption;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  usersRange?: UsersRange;
  subscription?: SubscriptionFilter;
}

export interface ToolDetailResult {
  tool: Tool;
  related: Tool[];
  mySubscription: { id: string; status: string; autoRenew: boolean } | null;
}

export const toolsApi = {
  list: (params: ToolListParams = {}) => {
    const query: Record<string, string> = {};
    if (params.category && params.category !== 'all') query.category = params.category;
    if (params.q) query.q = params.q;
    if (params.tags?.length) query.tags = params.tags.join(',');
    if (params.sort && params.sort !== 'popular') query.sort = params.sort;
    if (params.priceMin !== undefined) query.priceMin = String(params.priceMin);
    if (params.priceMax !== undefined) query.priceMax = String(params.priceMax);
    if (params.ratingMin !== undefined) query.ratingMin = String(params.ratingMin);
    if (params.usersRange && params.usersRange !== 'all') query.usersRange = params.usersRange;
    if (params.subscription && params.subscription !== 'all')
      query.subscription = params.subscription;
    return apiClient.get<unknown, { items: Tool[]; total: number }>('/tools', { params: query });
  },
  detail: (id: string) => apiClient.get<unknown, ToolDetailResult>(`/tools/${id}`),
  meta: () => apiClient.get<unknown, ToolsMeta>('/tools/meta'),
};

/* ---------------- 订阅 ---------------- */

export interface CreateSubscriptionPayload {
  planId: string;
  period: 'monthly' | 'yearly';
  idempotencyKey?: string;
}

export const subscriptionsApi = {
  list: (status?: string) =>
    apiClient.get<unknown, UserSubscription[]>('/subscriptions', {
      params: status ? { status } : undefined,
    }),
  create: (payload: CreateSubscriptionPayload) =>
    apiClient.post<unknown, UserSubscription>('/subscriptions', payload),
  setAutoRenew: (id: string, autoRenew: boolean) =>
    apiClient.patch<unknown, UserSubscription>(`/subscriptions/${id}/auto-renew`, { autoRenew }),
  cancel: (id: string) =>
    apiClient.post<unknown, UserSubscription>(`/subscriptions/${id}/cancel`),
  renew: (id: string, period: 'monthly' | 'yearly' = 'monthly', idempotencyKey?: string) =>
    apiClient.post<unknown, UserSubscription>(`/subscriptions/${id}/renew`, {
      period,
      idempotencyKey,
    }),
  bills: () => apiClient.get<unknown, Bill[]>('/subscriptions/bills'),
  stats: () =>
    apiClient.get<unknown, { monthlySpending: MonthlySpending[]; categorySpending: CategorySpending[] }>(
      '/subscriptions/stats'
    ),
};

/* ---------------- 用户资料 ---------------- */

export const usersApi = {
  getProfile: () => apiClient.get<unknown, UserProfile>('/users/me'),
  updateProfile: (payload: Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'location' | 'bio' | 'avatar'>>) =>
    apiClient.patch<unknown, User>('/users/me', payload),
  changePassword: (payload: { oldPassword: string; newPassword: string }) =>
    apiClient.post<unknown, { message: string }>('/users/me/change-password', payload),
  getNotifications: () => apiClient.get<unknown, NotificationSettings>('/users/me/notifications'),
  updateNotifications: (payload: Partial<NotificationSettings>) =>
    apiClient.put<unknown, NotificationSettings>('/users/me/notifications', payload),
};
