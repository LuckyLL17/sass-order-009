/** 后端 API 返回的数据结构，与 src/types/index.ts 的前端模型保持一致 */
export type Category = 'design' | 'development' | 'marketing' | 'collaboration';
export type PlanPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
export type BillStatus = 'paid' | 'pending' | 'failed';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone?: string;
  location?: string;
  bio?: string;
  settings?: Record<string, boolean>;
  createdAt?: string;
}

export interface PlanDTO {
  id: string;
  name: string;
  price: number;
  period: PlanPeriod;
  features: string[];
  recommended: boolean;
}

export interface ToolDTO {
  id: string;
  name: string;
  description: string;
  category: Category;
  logo: string;
  rating: number;
  usersCount: number;
  plans: PlanDTO[];
  features: string[];
  screenshots: string[];
  tags: string[];
}

export interface SubscriptionDTO {
  id: string;
  toolId: string;
  toolName: string;
  toolLogo: string;
  planName: string;
  price: number;
  period: PlanPeriod;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
}

export interface BillItemDTO {
  name: string;
  quantity: number;
  price: number;
}

export interface BillDTO {
  id: string;
  date: string;
  amount: number;
  status: BillStatus;
  items: BillItemDTO[];
}

export interface MonthlySpendingDTO {
  month: string;
  amount: number;
}

export interface CategorySpendingDTO {
  name: string;
  value: number;
}
