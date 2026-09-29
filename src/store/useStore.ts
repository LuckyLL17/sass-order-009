import { create } from 'zustand';
import type { User, UserSubscription, Tool, Category, SortOption, SubscriptionFilter, UsersRange } from '@/types';
import {
  authApi,
  toolsApi,
  subscriptionsApi,
  usersApi,
  type NotificationSettings,
  type CategoryMeta,
} from '@/api/services';
import { tokenStore, ApiRequestError } from '@/api/client';

interface Store {
  user: User | null;
  subscriptions: UserSubscription[];
  tools: Tool[];
  categories: CategoryMeta[];
  allTags: string[];
  selectedCategory: Category | 'all';
  searchQuery: string;
  sortBy: SortOption;
  priceMin: number;
  priceMax: number;
  ratingMin: number;
  ratingMax: number;
  usersRange: UsersRange;
  selectedTags: string[];
  subscriptionFilter: SubscriptionFilter;
  isAuthenticated: boolean;
  notificationSettings: NotificationSettings;
  authReady: boolean;
  toolsLoading: boolean;

  setUser: (user: User | null) => void;
  setSelectedCategory: (category: Category | 'all') => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  setPriceRange: (min: number, max: number) => void;
  setRatingRange: (min: number, max: number) => void;
  setUsersRange: (range: UsersRange) => void;
  setSelectedTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  setSubscriptionFilter: (filter: SubscriptionFilter) => void;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  authError: string;
  clearAuthError: () => void;

  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  reloadSubscriptions: () => Promise<void>;

  addSubscription: (
    payload: { planId: string; period: 'monthly' | 'yearly' },
    idempotencyKey?: string
  ) => Promise<UserSubscription>;
  cancelSubscription: (id: string) => Promise<void>;
  renewSubscription: (id: string) => Promise<void>;
  toggleAutoRenew: (id: string) => Promise<void>;
  downloadInvoice: (id: string) => void;
  getFilteredTools: () => Tool[];
  clearAllFilters: () => void;
  getAllTags: () => string[];
  getPriceRange: () => { min: number; max: number };
}

const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  subscriptionReminders: true,
  marketingEmails: false,
  securityAlerts: true,
};

// 与后端分类元数据保持一致的兜底数据
const FALLBACK_CATEGORIES: CategoryMeta[] = [
  { id: 'design', name: '设计工具', icon: 'Palette', color: 'from-pink-500 to-rose-500', count: 0 },
  { id: 'development', name: '开发工具', icon: 'Code2', color: 'from-blue-500 to-cyan-500', count: 0 },
  { id: 'marketing', name: '营销工具', icon: 'TrendingUp', color: 'from-amber-500 to-orange-500', count: 0 },
  { id: 'collaboration', name: '协作工具', icon: 'Users', color: 'from-green-500 to-emerald-500', count: 0 },
];

function errMessage(err: unknown, fallback: string) {
  return err instanceof ApiRequestError ? err.message : fallback;
}

/** 防止短时间内对同一资源重复发起写操作 */
const inFlight = new Set<string>();
async function guard<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) throw new ApiRequestError(409, 'DUPLICATE_REQUEST', '操作正在处理中，请勿重复提交');
  inFlight.add(key);
  try {
    return await fn();
  } finally {
    inFlight.delete(key);
  }
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  subscriptions: [],
  tools: [],
  categories: FALLBACK_CATEGORIES,
  allTags: [],
  selectedCategory: 'all',
  searchQuery: '',
  sortBy: 'popular',
  priceMin: 0,
  priceMax: 1000,
  ratingMin: 0,
  ratingMax: 5,
  usersRange: 'all',
  selectedTags: [],
  subscriptionFilter: 'all',
  isAuthenticated: false,
  notificationSettings: defaultNotificationSettings,
  authReady: false,
  toolsLoading: true,
  authError: '',

  setUser: (user) => set({ user }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setPriceRange: (min, max) => set({ priceMin: min, priceMax: max }),
  setRatingRange: (min, max) => set({ ratingMin: min, ratingMax: max }),
  setUsersRange: (range) => set({ usersRange: range }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  toggleTag: (tag) => set((state) => ({
    selectedTags: state.selectedTags.includes(tag)
      ? state.selectedTags.filter(t => t !== tag)
      : [...state.selectedTags, tag]
  })),
  setSubscriptionFilter: (filter) => set({ subscriptionFilter: filter }),
  clearAuthError: () => set({ authError: '' }),

  // 应用启动：加载工具目录；若本地存在 token 则恢复会话与订阅（保证刷新后数据保留）
  bootstrap: async () => {
    set({ toolsLoading: true });
    const [toolsResult, metaResult] = await Promise.allSettled([
      toolsApi.list(),
      toolsApi.meta(),
    ]);

    if (toolsResult.status === 'fulfilled') {
      set({ tools: toolsResult.value.items });
    } else {
      console.error('工具目录加载失败:', toolsResult.reason);
    }
    if (metaResult.status === 'fulfilled') {
      set({ categories: metaResult.value.categories, allTags: metaResult.value.tags });
    }
    set({ toolsLoading: false });

    if (tokenStore.get()) {
      try {
        const profile = await authApi.me();
        set({ user: profile, isAuthenticated: true });
        if (profile.notificationSettings) {
          set({ notificationSettings: { ...defaultNotificationSettings, ...profile.notificationSettings } });
        }
        await get().reloadSubscriptions();
      } catch {
        // token 失效：清理本地状态，停留在当前页（引导用户重新登录）
        tokenStore.clear();
        set({ user: null, isAuthenticated: false });
      }
    }
    set({ authReady: true });
  },

  login: async (email, password) => {
    set({ authError: '' });
    try {
      const { token, user } = await authApi.login({ email, password });
      tokenStore.set(token);
      set({ user, isAuthenticated: true });
      const [profileResult, subsResult] = await Promise.allSettled([
        usersApi.getProfile(),
        subscriptionsApi.list(),
      ]);
      if (profileResult.status === 'fulfilled' && profileResult.value.notificationSettings) {
        set({ notificationSettings: { ...defaultNotificationSettings, ...profileResult.value.notificationSettings } });
      }
      if (subsResult.status === 'fulfilled') set({ subscriptions: subsResult.value });
      return true;
    } catch (err) {
      set({ authError: errMessage(err, '登录失败，请检查邮箱和密码') });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ authError: '' });
    try {
      const { token, user } = await authApi.register({ name, email, password });
      tokenStore.set(token);
      set({ user, isAuthenticated: true, subscriptions: [] });
      return true;
    } catch (err) {
      set({ authError: errMessage(err, '注册失败，请检查输入信息') });
      return false;
    }
  },

  logout: async () => {
    tokenStore.clear();
    set({
      user: null,
      isAuthenticated: false,
      subscriptions: [],
      notificationSettings: defaultNotificationSettings,
    });
  },

  updateUserProfile: async (updates) => {
    try {
      const user = await usersApi.updateProfile(updates);
      set((state) => ({ user: state.user ? { ...state.user, ...user } : user }));
      return true;
    } catch (err) {
      set({ authError: errMessage(err, '资料保存失败') });
      return false;
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      await usersApi.changePassword({ oldPassword, newPassword });
      return true;
    } catch (err) {
      set({ authError: errMessage(err, '密码修改失败') });
      return false;
    }
  },

  updateNotificationSettings: async (settings) => {
    // 乐观更新，失败回滚
    const previous = get().notificationSettings;
    set((state) => ({ notificationSettings: { ...state.notificationSettings, ...settings } }));
    try {
      const next = await usersApi.updateNotifications(settings);
      set({ notificationSettings: next });
    } catch (err) {
      set({ notificationSettings: previous });
      throw err;
    }
  },

  reloadSubscriptions: async () => {
    if (!get().isAuthenticated) return;
    const subs = await subscriptionsApi.list();
    set({ subscriptions: subs });
  },

  addSubscription: async (payload, idempotencyKey) => {
    const key = idempotencyKey || `sub-${payload.planId}-${Date.now()}`;
    const created = await guard(`subscribe:${key}`, () =>
      subscriptionsApi.create({ ...payload, idempotencyKey: key })
    );
    // 服务端可能返回已存在的订阅（幂等），统一以 id 去重更新
    set((state) => {
      const rest = state.subscriptions.filter((s) => s.id !== created.id);
      return { subscriptions: [created, ...rest] };
    });
    return created;
  },

  cancelSubscription: async (id) => {
    const updated = await guard(`cancel:${id}`, () => subscriptionsApi.cancel(id));
    set((state) => ({
      subscriptions: state.subscriptions.map((s) => (s.id === id ? updated : s)),
    }));
  },

  renewSubscription: async (id) => {
    const key = `renew-${id}-${Date.now()}`;
    const updated = await guard(`renew:${id}:${key}`, () => subscriptionsApi.renew(id, 'monthly', key));
    set((state) => ({
      subscriptions: state.subscriptions.map((s) => (s.id === id ? updated : s)),
    }));
  },

  toggleAutoRenew: async (id) => {
    const target = get().subscriptions.find((s) => s.id === id);
    if (!target) return;
    const updated = await guard(`auto-renew:${id}`, () =>
      subscriptionsApi.setAutoRenew(id, !target.autoRenew)
    );
    set((state) => ({
      subscriptions: state.subscriptions.map((s) => (s.id === id ? updated : s)),
    }));
  },

  downloadInvoice: (id) => {
    const subscription = get().subscriptions.find(s => s.id === id);
    if (!subscription) return;

    const invoiceContent = `
发票
=====================================
发票编号: INV-${id.toUpperCase()}
日期: ${new Date().toLocaleDateString('zh-CN')}

订阅信息:
工具名称: ${subscription.toolName}
订阅方案: ${subscription.planName}
订阅周期: ${subscription.period === 'monthly' ? '月度' : '年度'}
开始日期: ${subscription.startDate}
结束日期: ${subscription.endDate}

费用明细:
=====================================
订阅费用: ¥${subscription.price}
=====================================
总计: ¥${subscription.price}

感谢您使用 SubHub!
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `发票-${subscription.toolName}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getFilteredTools: () => {
    const { tools, selectedCategory, searchQuery, priceMin, priceMax, ratingMin, ratingMax, usersRange, selectedTags, subscriptionFilter, sortBy, subscriptions } = get();

    const filtered = tools.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;

      const matchesSearch = !searchQuery ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const minPrice = Math.min(...tool.plans.map(p => p.price));
      const matchesPrice = minPrice >= priceMin && minPrice <= priceMax;

      const matchesRating = tool.rating >= ratingMin && tool.rating <= ratingMax;

      let matchesUsers = true;
      switch (usersRange) {
        case 'lt-10k':
          matchesUsers = tool.usersCount < 10000;
          break;
        case '10k-50k':
          matchesUsers = tool.usersCount >= 10000 && tool.usersCount < 50000;
          break;
        case '50k-100k':
          matchesUsers = tool.usersCount >= 50000 && tool.usersCount < 100000;
          break;
        case 'gt-100k':
          matchesUsers = tool.usersCount >= 100000;
          break;
      }

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag => tool.tags.includes(tag));

      let matchesSubscription = true;
      const userSub = subscriptions.find(s => s.toolId === tool.id);
      switch (subscriptionFilter) {
        case 'subscribed':
          matchesSubscription = !!userSub && userSub.status === 'active';
          break;
        case 'not-subscribed':
          matchesSubscription = !userSub || userSub.status !== 'active';
          break;
        case 'expired':
          matchesSubscription = !!userSub && userSub.status === 'expired';
          break;
      }

      return matchesCategory && matchesSearch && matchesPrice && matchesRating && matchesUsers && matchesTags && matchesSubscription;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'price-low':
          return Math.min(...a.plans.map(p => p.price)) - Math.min(...b.plans.map(p => p.price));
        case 'price-high':
          return Math.min(...b.plans.map(p => p.price)) - Math.min(...a.plans.map(p => p.price));
        case 'newest':
          return parseInt(b.id) - parseInt(a.id);
        case 'users-desc':
          return b.usersCount - a.usersCount;
        case 'users-asc':
          return a.usersCount - b.usersCount;
        case 'popular':
        default:
          return b.usersCount - a.usersCount;
      }
    });
  },

  clearAllFilters: () => set({
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'popular',
    priceMin: 0,
    priceMax: 1000,
    ratingMin: 0,
    ratingMax: 5,
    usersRange: 'all',
    selectedTags: [],
    subscriptionFilter: 'all',
  }),

  getAllTags: () => get().allTags,

  getPriceRange: () => {
    const { tools } = get();
    if (!tools.length) return { min: 0, max: 0 };
    const prices = tools.flatMap(tool => tool.plans.map(p => p.price));
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  },
}));

// 收到 401 事件时复位认证状态（API 层已清除 token）
window.addEventListener('subhub:unauthorized', () => {
  useStore.setState({ user: null, isAuthenticated: false, subscriptions: [] });
});
