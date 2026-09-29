import { getDb } from '../db/index.js';
import { deriveStatus } from '../utils/date.js';
import type { SubscriptionDTO } from '../types.js';

interface SubscriptionRow {
  id: string;
  user_id: string;
  tool_id: string;
  plan_id: string;
  plan_name: string;
  price: number;
  period: 'monthly' | 'yearly';
  status: string;
  auto_renew: number;
  start_date: string;
  end_date: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  tool_name: string;
  tool_logo: string;
}

function toDTO(row: SubscriptionRow, now = new Date()): SubscriptionDTO {
  return {
    id: row.id,
    toolId: row.tool_id,
    toolName: row.tool_name,
    toolLogo: row.tool_logo,
    planName: row.plan_name,
    price: row.price,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
    status: deriveStatus(row.status, row.end_date, now),
    autoRenew: row.auto_renew === 1,
  };
}

const SELECT_WITH_TOOL = /* sql */ `
  SELECT s.*, t.name AS tool_name, t.logo AS tool_logo
  FROM subscriptions s
  JOIN tools t ON t.id = s.tool_id
`;

export interface CreateSubscriptionData {
  id: string;
  userId: string;
  toolId: string;
  planId: string;
  planName: string;
  price: number;
  period: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
}

export const subscriptionRepository = {
  listByUser(userId: string, now = new Date()): SubscriptionDTO[] {
    const rows = getDb()
      .prepare(`${SELECT_WITH_TOOL} WHERE s.user_id = ? ORDER BY s.created_at DESC`)
      .all(userId) as SubscriptionRow[];
    return rows.map((r) => toDTO(r, now));
  },

  findByIdForUser(id: string, userId: string, now = new Date()): SubscriptionDTO | undefined {
    const row = getDb()
      .prepare(`${SELECT_WITH_TOOL} WHERE s.id = ? AND s.user_id = ?`)
      .get(id, userId) as SubscriptionRow | undefined;
    return row ? toDTO(row, now) : undefined;
  },

  findActiveByTool(userId: string, toolId: string): SubscriptionRow | undefined {
    return getDb()
      .prepare(
        `SELECT * FROM subscriptions
         WHERE user_id = ? AND tool_id = ? AND status = 'active'`
      )
      .get(userId, toolId) as SubscriptionRow | undefined;
  },

  /** toolId -> 最新一条订阅状态（用于市场页订阅状态过滤） */
  statusMapByUser(userId: string): Map<string, string> {
    const rows = getDb()
      .prepare(
        `SELECT tool_id, status, end_date
         FROM subscriptions
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .all(userId) as { tool_id: string; status: string; end_date: string }[];
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!map.has(r.tool_id)) {
        map.set(r.tool_id, deriveStatus(r.status, r.end_date));
      }
    }
    return map;
  },

  create(data: CreateSubscriptionData, now = new Date()): SubscriptionDTO {
    const db = getDb();
    db.prepare(
      /* sql */ `
      INSERT INTO subscriptions
        (id, user_id, tool_id, plan_id, plan_name, price, period,
         status, auto_renew, start_date, end_date)
      VALUES
        (@id, @userId, @toolId, @planId, @planName, @price, @period,
         'active', 1, @startDate, @endDate)
      `
    ).run(data);

    return this.findByIdForUser(data.id, data.userId, now)!;
  },

  cancel(id: string, now = new Date()): SubscriptionDTO | undefined {
    const db = getDb();
    db.prepare(
      /* sql */ `
      UPDATE subscriptions
      SET status = 'cancelled', auto_renew = 0,
          cancelled_at = date('now'), updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(id);
    const row = db
      .prepare(`${SELECT_WITH_TOOL} WHERE s.id = ?`)
      .get(id) as SubscriptionRow | undefined;
    return row ? toDTO(row, now) : undefined;
  },

  /** 续订：重置周期与状态（仅允许非活跃订阅续订） */
  renew(
    id: string,
    updates: { planId: string; planName: string; price: number; period: 'monthly' | 'yearly'; startDate: string; endDate: string },
    now = new Date()
  ): SubscriptionDTO | undefined {
    const db = getDb();
    db.prepare(
      /* sql */ `
      UPDATE subscriptions
      SET plan_id = @planId, plan_name = @planName, price = @price, period = @period,
          status = 'active', auto_renew = 1,
          start_date = @startDate, end_date = @endDate,
          cancelled_at = NULL, updated_at = datetime('now')
      WHERE id = @id
      `
    ).run({ id, ...updates });
    const row = db
      .prepare(`${SELECT_WITH_TOOL} WHERE s.id = ?`)
      .get(id) as SubscriptionRow | undefined;
    return row ? toDTO(row, now) : undefined;
  },

  setAutoRenew(id: string, autoRenew: boolean, now = new Date()): SubscriptionDTO | undefined {
    getDb()
      .prepare(
        `UPDATE subscriptions SET auto_renew = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(autoRenew ? 1 : 0, id);
    const row = getDb()
      .prepare(`${SELECT_WITH_TOOL} WHERE s.id = ?`)
      .get(id) as SubscriptionRow | undefined;
    return row ? toDTO(row, now) : undefined;
  },
};
