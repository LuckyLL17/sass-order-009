export const CATEGORIES = ['design', 'development', 'marketing', 'collaboration'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLAN_PERIODS = ['monthly', 'yearly'] as const;
export type PlanPeriod = (typeof PLAN_PERIODS)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'expired', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SORT_OPTIONS = [
  'popular',
  'rating',
  'price-low',
  'price-high',
  'newest',
  'users-desc',
  'users-asc',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SUBSCRIPTION_FILTERS = ['all', 'subscribed', 'not-subscribed', 'expired'] as const;
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];

export const USERS_RANGES = ['all', 'lt-10k', '10k-50k', '50k-100k', 'gt-100k'] as const;
export type UsersRange = (typeof USERS_RANGES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  design: '设计工具',
  development: '开发工具',
  marketing: '营销工具',
  collaboration: '协作工具',
};
