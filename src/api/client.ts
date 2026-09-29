import axios, { AxiosError } from 'axios';

/**
 * 统一后端错误格式：
 * { success: false, error: { code, message, details?: {field,message}[] } }
 */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** 取某个字段的校验提示，便于表单内联展示 */
  fieldError(field: string): string | undefined {
    return this.details?.find((d) => d.field === field)?.message;
  }
}

const TOKEN_KEY = 'subhub_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

// 请求拦截：自动附带 JWT
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：拆包 { success, data }，统一错误对象
apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error: AxiosError<unknown>) => {
    if (error.response) {
      const { status, data } = error.response;
      const apiErr = (data as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } })?.error;
      const normalized = new ApiRequestError(
        status,
        apiErr?.code || 'UNKNOWN',
        apiErr?.message || '请求失败，请稍后重试',
        apiErr?.details
      );

      // 401：清除失效的本地凭证（由调用方决定是否跳转登录页）
      if (status === 401) {
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent('subhub:unauthorized'));
      }
      return Promise.reject(normalized);
    }

    if (error.request) {
      return Promise.reject(
        new ApiRequestError(0, 'NETWORK_ERROR', '无法连接服务器，请确认后端服务已启动')
      );
    }

    return Promise.reject(new ApiRequestError(0, 'CLIENT_ERROR', error.message));
  }
);
