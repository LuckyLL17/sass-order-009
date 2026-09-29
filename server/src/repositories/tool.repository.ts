import { getDb } from '../db/index.js';
import type { PlanDTO, ToolDTO } from '../types.js';
import type {
  Category,
  SortOption,
  SubscriptionFilter,
  UsersRange,
} from '../enums.js';

interface ToolRow {
  id: string;
  name: string;
  description: string;
  category: Category;
  logo: string;
  rating: number;
  users_count: number;
  sort_order: number;
}

export interface ToolQuery {
  category?: Category | 'all';
  search?: string;
  sort?: SortOption;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  usersRange?: UsersRange;
  tags?: string[];
  subscriptionFilter?: SubscriptionFilter;
  /** 已鉴权用户的订阅状态映射 toolId -> status，用于订阅状态过滤 */
  subscriptionStatusMap?: Map<string, string>;
}

export const toolRepository = {
  hydrate(row: ToolRow): ToolDTO {
    const db = getDb();
    const features = (
      db
        .prepare('SELECT content FROM tool_features WHERE tool_id = ? ORDER BY position')
        .all(row.id) as { content: string }[]
    ).map((r) => r.content);
    const screenshots = (
      db
        .prepare('SELECT url FROM tool_screenshots WHERE tool_id = ? ORDER BY position')
        .all(row.id) as { url: string }[]
    ).map((r) => r.url);
    const tags = (
      db
        .prepare('SELECT tag FROM tool_tags WHERE tool_id = ? ORDER BY id')
        .all(row.id) as { tag: string }[]
    ).map((r) => r.tag);
    const plans = this.findPlansByToolId(row.id);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      logo: row.logo,
      rating: row.rating,
      usersCount: row.users_count,
      plans,
      features,
      screenshots,
      tags,
    };
  },

  findPlansByToolId(toolId: string): PlanDTO[] {
    const db = getDb();
    const planRows = db
      .prepare('SELECT * FROM plans WHERE tool_id = ? ORDER BY position')
      .all(toolId) as {
      id: string;
      tool_id: string;
      name: string;
      price: number;
      period: PlanDTO['period'];
      recommended: number;
      position: number;
    }[];

    return planRows.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      period: p.period,
      recommended: p.recommended === 1,
      features: (
        db
          .prepare('SELECT content FROM plan_features WHERE plan_id = ? ORDER BY position')
          .all(p.id) as { content: string }[]
      ).map((r) => r.content),
    }));
  },

  findById(id: string): ToolDTO | undefined {
    const row = getDb().prepare('SELECT * FROM tools WHERE id = ?').get(id) as
      | ToolRow
      | undefined;
    return row ? this.hydrate(row) : undefined;
  },

  findPlan(planId: string): { id: string; toolId: string; name: string; price: number } | undefined {
    const row = getDb()
      .prepare('SELECT id, tool_id AS toolId, name, price FROM plans WHERE id = ?')
      .get(planId) as { id: string; toolId: string; name: string; price: number } | undefined;
    return row;
  },

  findAll(query: ToolQuery = {}): ToolDTO[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM tools ORDER BY sort_order, id')
      .all() as ToolRow[];

    let tools = rows.map((r) => this.hydrate(r));

    if (query.category && query.category !== 'all') {
      tools = tools.filter((t) => t.category === query.category);
    }

    if (query.search) {
      const q = query.search.toLowerCase();
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      const min = query.priceMin ?? 0;
      const max = query.priceMax ?? Number.POSITIVE_INFINITY;
      tools = tools.filter((t) => {
        const minPrice = Math.min(...t.plans.map((p) => p.price));
        return minPrice >= min && minPrice <= max;
      });
    }

    if (query.ratingMin !== undefined) {
      tools = tools.filter((t) => t.rating >= query.ratingMin!);
    }

    if (query.usersRange && query.usersRange !== 'all') {
      tools = tools.filter((t) => {
        switch (query.usersRange) {
          case 'lt-10k':
            return t.usersCount < 10000;
          case '10k-50k':
            return t.usersCount >= 10000 && t.usersCount < 50000;
          case '50k-100k':
            return t.usersCount >= 50000 && t.usersCount < 100000;
          case 'gt-100k':
            return t.usersCount >= 100000;
          default:
            return true;
        }
      });
    }

    if (query.tags && query.tags.length > 0) {
      tools = tools.filter((t) => query.tags!.every((tag) => t.tags.includes(tag)));
    }

    const subMap = query.subscriptionStatusMap;
    if (subMap && query.subscriptionFilter && query.subscriptionFilter !== 'all') {
      tools = tools.filter((t) => {
        const status = subMap.get(t.id);
        switch (query.subscriptionFilter) {
          case 'subscribed':
            return status === 'active';
          case 'not-subscribed':
            return status !== 'active';
          case 'expired':
            return status === 'expired';
          default:
            return true;
        }
      });
    }

    switch (query.sort) {
      case 'rating':
        tools.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        tools.sort(
          (a, b) =>
            Math.min(...a.plans.map((p) => p.price)) - Math.min(...b.plans.map((p) => p.price))
        );
        break;
      case 'price-high':
        tools.sort(
          (a, b) =>
            Math.min(...b.plans.map((p) => p.price)) - Math.min(...a.plans.map((p) => p.price))
        );
        break;
      case 'newest':
        tools.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      case 'users-asc':
        tools.sort((a, b) => a.usersCount - b.usersCount);
        break;
      case 'users-desc':
      case 'popular':
      default:
        tools.sort((a, b) => b.usersCount - a.usersCount);
        break;
    }

    return tools;
  },

  getAllTags(): string[] {
    const rows = getDb().prepare('SELECT DISTINCT tag FROM tool_tags ORDER BY tag').all() as {
      tag: string;
    }[];
    return rows.map((r) => r.tag);
  },

  countByCategory(): Record<string, number> {
    const rows = getDb()
      .prepare('SELECT category, COUNT(*) AS count FROM tools GROUP BY category')
      .all() as { category: string; count: number }[];
    return Object.fromEntries(rows.map((r) => [r.category, r.count]));
  },
};
