import { getDb } from '../db/index.js';
import { CATEGORY_LABELS, type Category } from '../enums.js';
import type { BillDTO, CategorySpendingDTO, MonthlySpendingDTO } from '../types.js';
import { monthKey } from '../utils/date.js';

interface BillRow {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  bill_date: string;
  created_at: string;
}

export const billRepository = {
  create(data: {
    id: string;
    userId: string;
    subscriptionId: string;
    amount: number;
    status?: 'paid' | 'pending' | 'failed';
    billDate: string;
    items: { name: string; quantity: number; price: number }[];
  }) {
    const db = getDb();
    const tx = db.transaction(() => {
      db.prepare(
        /* sql */ `
        INSERT INTO bills (id, user_id, subscription_id, amount, status, bill_date)
        VALUES (@id, @userId, @subscriptionId, @amount, @status, @billDate)
        `
      ).run({
        id: data.id,
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        status: data.status ?? 'paid',
        billDate: data.billDate,
      });
      const stmt = db.prepare(
        'INSERT INTO bill_items (bill_id, name, quantity, price) VALUES (?, ?, ?, ?)'
      );
      for (const item of data.items) {
        stmt.run(data.id, item.name, item.quantity, item.price);
      }
    });
    tx();
  },

  listByUser(userId: string): BillDTO[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY bill_date DESC')
      .all(userId) as BillRow[];

    return rows.map((row) => {
      const items = db
        .prepare('SELECT name, quantity, price FROM bill_items WHERE bill_id = ?')
        .all(row.id) as { name: string; quantity: number; price: number }[];
      return {
        id: row.id,
        date: row.bill_date,
        amount: row.amount,
        status: row.status,
        items,
      };
    });
  },

  /** 近 N 个月支出（按账单日期聚合，单位：元） */
  monthlySpending(userId: string, months = 6): MonthlySpendingDTO[] {
    const bills = this.listByUser(userId).filter((b) => b.status === 'paid');
    const now = new Date();
    const buckets = new Map<string, number>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(monthKey(d), 0);
    }
    for (const bill of bills) {
      const key = bill.date.slice(0, 7);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + bill.amount);
      }
    }
    return [...buckets.entries()].map(([key, amount]) => {
      const [, month] = key.split('-');
      return { month: `${Number(month)}月`, amount };
    });
  },

  /** 按工具分类聚合当前活跃订阅的月支出 */
  categorySpending(userId: string): CategorySpendingDTO[] {
    const rows = getDb()
      .prepare(
        /* sql */ `
        SELECT t.category AS category,
               SUM(CASE WHEN s.period = 'yearly' THEN s.price / 12.0 ELSE s.price END) AS value
        FROM subscriptions s
        JOIN tools t ON t.id = s.tool_id
        WHERE s.user_id = ? AND s.status = 'active'
        GROUP BY t.category
        ORDER BY value DESC
        `
      )
      .all(userId) as { category: Category; value: number }[];

    return rows.map((r) => ({
      name: CATEGORY_LABELS[r.category] ?? r.category,
      value: Math.round(r.value * 100) / 100,
    }));
  },
};
