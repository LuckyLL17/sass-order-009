import { create } from 'zustand';
import type { User, UserSubscription, Tool, Category, SortOption, SubscriptionFilter, UsersRange } from '@/types';
import type {
  SubscriptionDTO,
  ToolDTO,
  UserDTO,
} from '@/types/api';
import { api, TOKEN_KEY, ApiError } from '@/api/client';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  subscriptionReminders: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  subscriptionReminders: true,
  marketingEmails: false,
  securityAlerts: true,
};

function toUser(dto: UserDTO): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    avatar: dto.avatar,
  };
}

function toSubscription(dto: SubscriptionDTO): UserSubscription {
  return { ...dto };
}

function toTool(dto: ToolDTO): Tool {
  return { ...dto };
}

interface Store {
  user: User | null;
  subscriptions: UserSubscription[];
  tools: Tool[];
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

  // 加载状态
  toolsLoading: boolean;
  subscriptionsLoading: boolean;
  bootstrapped: boolean;

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
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User> & { phone?: string; location?: string; bio?: string }) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  addSubscription: (subscription: UserSubscription) => Promise<void>;
  createSubscription: (payload: { toolId: string; planId: string; period: 'monthly' | 'yearly' }) => Promise<UserSubscription>;
  cancelSubscription: (id: string) => Promise<void>;
  renewSubscription: (id: string) => Promise<void>;
  toggleAutoRenew: (id: string) => Promise<void>;
  downloadInvoice: (id: string) => void;
  getFilteredTools: () => Tool[];
  clearAllFilters: () => void;
  getAllTags: () => string[];
  getPriceRange: () => { min: number; max: number };
  bootstrap: () => Promise<void>;
  loadSubscriptions: () => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  subscriptions: [],
  tools: [],
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

  toolsLoading: false,
  subscriptionsLoading: false,
  bootstrapped: false,

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

  login: async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem(TOKEN_KEY, token);
    set({ user: toUser(user), isAuthenticated: true });
    // 登录成功后立即拉取该用户的持久化数据
    await get().loadSubscriptions().catch(() => undefined);
    api.getProfileMeta()
      .then(({ settings }) =>
        set({ notificationSettings: { ...defaultNotificationSettings, ...settings } })
      )
      .catch(() => undefined);
    return true;
  },

  register: async (name, email, password) => {
    const { token, user } = await api.register({ name, email, password });
    localStorage.setItem(TOKEN_KEY, token);
    set({ user: toUser(user), isAuthenticated: true, subscriptions: [] });
    return true;
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      user: null,
      isAuthenticated: false,
      subscriptions: [],
      notificationSettings: defaultNotificationSettings,
      subscriptionFilter: 'all',
    });
  },

  updateUserProfile: async (
    updates: Partial<User> & { phone?: string; location?: string; bio?: string }
  ) => {
    const updated = await api.updateProfile(updates);
    set((state) => ({
      user: state.user ? { ...state.user, ...toUser(updated) } : null,
    }));
  },

  changePassword: async (oldPassword, newPassword) => {
    await api.changePassword({ oldPassword, newPassword });
    return true;
  },

  updateNotificationSettings: async (settings) => {
    // 乐观更新，失败时回滚
    const previous = get().notificationSettings;
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, ...settings },
    }));
    try {
      const saved = await api.updateNotificationSettings(settings);
      set({ notificationSettings: { ...defaultNotificationSettings, ...saved } });
    } catch (err) {
      set({ notificationSettings: previous });
      throw err;
    }
  },

  addSubscription: async (subscription) =>
    set((state) => ({ subscriptions: [...state.subscriptions, subscription] })),

  createSubscription: async (payload) => {
    const dto = await api.createSubscription(payload);
    const sub = toSubscription(dto);
    set((state) => {
      // 极端情况下替换同 id / 同工具的旧记录
      const others = state.subscriptions.filter(
        (s) => s.id !== sub.id && s.toolId !== sub.toolId
      );
      return { subscriptions: [sub, ...others] };
    });
    return sub;
  },

  cancelSubscription: async (id) => {
    const dto = await api.cancelSubscription(id);
    const updated = toSubscription(dto);
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) => (sub.id === id ? updated : sub)),
    }));
  },

  renewSubscription: async (id) => {
    const dto = await api.renewSubscription(id);
    const updated = toSubscription(dto);
    set((state) => ({
      subscriptions: state.subscriptions.map((sub) => (sub.id === id ? updated : sub)),
    }));
  },

  toggleAutoRenew: async (id) => {
    const target = get().subscriptions.find((s) => s.id === id);
    if (!target) return;
    const next = !target.autoRenew;
    // 乐观更新，失败回滚
    set((state) => ({
      subscriptions: state.subscriptions.map((s) =>
        s.id === id ? { ...s, autoRenew: next } : s
      ),
    }));
    try {
      const dto = await api.setAutoRenew(id, next);
      const updated = toSubscription(dto);
      set((state) => ({
        subscriptions: state.subscriptions.map((s) => (s.id === id ? updated : s)),
      }));
    } catch (err) {
      set((state) => ({
        subscriptions: state.subscriptions.map((s) =>
          s.id === id ? { ...s, autoRenew: !next } : s
        ),
      }));
      throw err;
    }
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
    const { tools, selectedCategory, searchQuery, priceMin, priceMax, ratingMin, usersRange, selectedTags, subscriptionFilter, sortBy, subscriptions } = get();

    const filtered = tools.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;

      const matchesSearch = !searchQuery ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const minPrice = Math.min(...tool.plans.map(p => p.price));
      const matchesPrice = minPrice >= priceMin && minPrice <= priceMax;

      const matchesRating = tool.rating >= ratingMin;

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

  getAllTags: () => {
    const { tools } = get();
    const tagSet = new Set<string>();
    tools.forEach(tool => tool.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  },

  getPriceRange: () => {
    const { tools } = get();
    if (tools.length === 0) return { min: 0, max: 1000 };
    const prices = tools.flatMap(tool => tool.plans.map(p => p.price));
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  },

  loadSubscriptions: async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    set({ subscriptionsLoading: true });
    try {
      const list = await api.listSubscriptions();
      set({ subscriptions: list.map(toSubscription) });
    } finally {
      set({ subscriptionsLoading: false });
    }
  },

  bootstrap: async () => {
    // 工具数据（公开）与登录态恢复并行进行
    set({ toolsLoading: true });
    const toolsPromise = api
      .listTools()
      .then((list) => set({ tools: list.map(toTool) }))
      .catch((err) => {
        if (err instanceof ApiError || err instanceof Error) {
          console.error('[bootstrap] 加载工具失败:', err.message);
        }
      })
      .finally(() => set({ toolsLoading: false }));

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const { user } = await api.me();
        set({ user: toUser(user), isAuthenticated: true });
      } catch {
        // token 失效：清理本地登录态，回到未登录状态
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, isAuthenticated: false });
      }
      if (get().isAuthenticated) {
        await Promise.all([
          get().loadSubscriptions().catch(() => undefined),
          api
            .getProfileMeta()
            .then(({ settings }) =>
              set({ notificationSettings: { ...defaultNotificationSettings, ...settings } })
            )
            .catch(() => undefined),
        ]);
      }
    }

    await toolsPromise;
    set({ bootstrapped: true });
  },
}));
