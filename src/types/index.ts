export type Category = 'design' | 'development' | 'marketing' | 'collaboration';
export type PlanPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
export type BillStatus = 'paid' | 'pending' | 'failed';
export type TeamRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'pending';
export type SortOption = 'popular' | 'rating' | 'price-low' | 'price-high' | 'newest' | 'users-desc' | 'users-asc';
export type SubscriptionFilter = 'all' | 'subscribed' | 'not-subscribed' | 'expired';
export type UsersRange = 'all' | 'lt-10k' | '10k-50k' | '50k-100k' | 'gt-100k';

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: PlanPeriod;
  features: string[];
  recommended?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: Category;
  logo: string;
  rating: number;
  usersCount: number;
  plans: Plan[];
  features: string[];
  screenshots: string[];
  tags: string[];
}

export interface UserSubscription {
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

export interface BillItem {
  name: string;
  quantity: number;
  price: number;
  toolId?: string;
}

export interface Bill {
  id: string;
  date: string;
  amount: number;
  status: BillStatus;
  items: BillItem[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: TeamRole;
  joinDate: string;
  status: MemberStatus;
  subscriptions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone?: string;
  location?: string;
  bio?: string;
  teamId?: string;
  teamRole?: TeamRole;
}

export interface MonthlySpending {
  month: string;
  amount: number;
}

export interface CategorySpending {
  name: string;
  value: number;
}
