import axios, { type AxiosRequestConfig } from 'axios';
import type {
  BillDTO,
  CategorySpendingDTO,
  MonthlySpendingDTO,
  SubscriptionDTO,
  ToolDTO,
  UserDTO,
} from '@/types/api';

export const TOKEN_KEY = 'subhub_token';

/** 统一业务错误：与后端错误格式 { error:{code,message,details} } 对齐 */
export class ApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(code: string, message: string, details?: unknown, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截：自动附加 JWT
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：解包统一格式，把后端错误转换为 ApiError
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data;
    if (body?.error) {
      return Promise.reject(
        new ApiError(body.error.code, body.error.message, body.error.details, error.response.status)
      );
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('TIMEOUT', '请求超时，请稍后重试'));
    }
    return Promise.reject(new ApiError('NETWORK_ERROR', '网络连接失败，请确认后端服务已启动'));
  }
);

interface AuthResponse {
  token: string;
  user: UserDTO;
}

async function unwrap<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<{ success: true; data: T }>(config);
  return res.data.data;
}

export const api = {
  // ---- 鉴权 ----
  register: (data: { name: string; email: string; password: string }) =>
    unwrap<AuthResponse>({ url: '/auth/register', method: 'POST', data }),

  login: (data: { email: string; password: string }) =>
    unwrap<AuthResponse>({ url: '/auth/login', method: 'POST', data }),

  me: () => unwrap<{ user: UserDTO }>({ url: '/auth/me', method: 'GET' }),

  // ---- 工具 ----
  listTools: () => unwrap<ToolDTO[]>({ url: '/tools', method: 'GET' }),

  getTool: (id: string) => unwrap<ToolDTO>({ url: `/tools/${id}`, method: 'GET' }),

  // ---- 订阅 ----
  listSubscriptions: () =>
    unwrap<SubscriptionDTO[]>({ url: '/subscriptions', method: 'GET' }),

  createSubscription: (data: { toolId: string; planId: string; period: 'monthly' | 'yearly' }) =>
    unwrap<SubscriptionDTO>({ url: '/subscriptions', method: 'POST', data }),

  cancelSubscription: (id: string) =>
    unwrap<SubscriptionDTO>({ url: `/subscriptions/${id}/cancel`, method: 'POST' }),

  renewSubscription: (id: string, period?: 'monthly' | 'yearly') =>
    unwrap<SubscriptionDTO>({ url: `/subscriptions/${id}/renew`, method: 'POST', data: { period } }),

  setAutoRenew: (id: string, autoRenew: boolean) =>
    unwrap<SubscriptionDTO>({ url: `/subscriptions/${id}/auto-renew`, method: 'PATCH', data: { autoRenew } }),

  subscriptionStats: () =>
    unwrap<{
      bills: BillDTO[];
      monthlySpending: MonthlySpendingDTO[];
      categorySpending: CategorySpendingDTO[];
    }>({ url: '/subscriptions/stats/summary', method: 'GET' }),

  // ---- 用户 ----
  updateProfile: (data: Partial<Pick<UserDTO, 'name' | 'email' | 'avatar' | 'phone' | 'location' | 'bio'>>) =>
    unwrap<UserDTO>({ url: '/users/me/profile', method: 'PUT', data }),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    unwrap<{ message: string }>({ url: '/users/me/password', method: 'PUT', data }),

  getProfileMeta: () =>
    unwrap<{ settings: Record<string, boolean> }>({
      url: '/users/me/profile',
      method: 'GET',
    }),

  updateNotificationSettings: (data: Partial<Record<string, boolean>>) =>
    unwrap<Record<string, boolean>>({
      url: '/users/me/notification-settings',
      method: 'PUT',
      data,
    }),
};
