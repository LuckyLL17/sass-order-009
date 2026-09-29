import { toolRepository, type ToolQuery } from '../repositories/tool.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { AppError } from '../utils/errors.js';
import type { ToolDTO } from '../types.js';
import type {
  Category,
  SortOption,
  SubscriptionFilter,
  UsersRange,
} from '../enums.js';

export interface ToolListParams {
  category?: Category | 'all';
  search?: string;
  sort?: SortOption;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  usersRange?: UsersRange;
  tags?: string[];
  subscriptionFilter?: SubscriptionFilter;
}

export const toolService = {
  list(params: ToolListParams, userId?: string): ToolDTO[] {
    const query: ToolQuery = { ...params };

    // 订阅状态过滤依赖登录用户；未登录时只有 all / not-subscribed 有意义
    if (params.subscriptionFilter && params.subscriptionFilter !== 'all') {
      if (!userId) {
        if (params.subscriptionFilter === 'not-subscribed') {
          query.subscriptionStatusMap = new Map();
        }
      } else {
        query.subscriptionStatusMap = subscriptionRepository.statusMapByUser(userId);
      }
    }

    return toolRepository.findAll(query);
  },

  getById(id: string): ToolDTO {
    const tool = toolRepository.findById(id);
    if (!tool) throw AppError.notFound('工具不存在或已下架');
    return tool;
  },

  getAllTags(): string[] {
    return toolRepository.getAllTags();
  },

  categoryCounts(): { total: number; categories: Record<string, number> } {
    const counts = toolRepository.countByCategory();
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return { total, categories: counts };
  },
};
