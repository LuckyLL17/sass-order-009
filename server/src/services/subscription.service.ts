import { randomUUID } from 'node:crypto';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { toolRepository } from '../repositories/tool.repository.js';
import { billRepository } from '../repositories/bill.repository.js';
import { getDb } from '../db/index.js';
import { AppError } from '../utils/errors.js';
import { addDays, periodDays, toDateString } from '../utils/date.js';
import type { PlanPeriod, SubscriptionStatus } from '../enums.js';
import type {
  BillDTO,
  CategorySpendingDTO,
  MonthlySpendingDTO,
  SubscriptionDTO,
} from '../types.js';

// 年付享受 8 折（与前端展示一致：月价 * 12 * 0.8）
const YEARLY_DISCOUNT = 0.8;

function computePrice(monthlyPrice: number, period: PlanPeriod): number {
  return period === 'yearly'
    ? Math.round(monthlyPrice * 12 * YEARLY_DISCOUNT)
    : monthlyPrice;
}

/** 校验工具与方案归属，返回工具和月付方案 */
function resolveToolPlan(toolId: string, planId: string) {
  const tool = toolRepository.findById(toolId);
  if (!tool) throw AppError.notFound('工具不存在或已下架');

  const plan = tool.plans.find((p) => p.id === planId);
  if (!plan) {
    throw AppError.badRequest('所选订阅方案不存在', { field: 'planId' });
  }
  return { tool, plan };
}

function createBill(
  userId: string,
  subscriptionId: string,
  toolName: string,
  planName: string,
  amount: number,
  billDate: string
) {
  billRepository.create({
    id: `bill_${randomUUID()}`,
    userId,
    subscriptionId,
    amount,
    status: 'paid',
    billDate,
    items: [{ name: `${toolName} ${planName}`, quantity: 1, price: amount }],
  });
}

export const subscriptionService = {
  list(userId: string, status?: SubscriptionStatus): SubscriptionDTO[] {
    const all = subscriptionRepository.listByUser(userId);
    return status ? all.filter((s) => s.status === status) : all;
  },

  /** 新增订阅（鉴权 + 归属 + 防重复由服务层与数据库唯一索引共同保证） */
  create(
    userId: string,
    input: { toolId: string; planId: string; period: PlanPeriod }
  ): SubscriptionDTO {
    const { tool, plan } = resolveToolPlan(input.toolId, input.planId);

    const existing = subscriptionRepository.findActiveByTool(userId, tool.id);
    if (existing) {
      throw AppError.conflict('您已订阅该工具，请勿重复提交');
    }

    const price = computePrice(plan.price, input.period);
    const start = new Date();
    const startDate = toDateString(start);
    const endDate = toDateString(addDays(periodDays(input.period), start));
    const id = `sub_${randomUUID()}`;

    const db = getDb();
    const tx = db.transaction(() => {
      subscriptionRepository.create({
        id,
        userId,
        toolId: tool.id,
        planId: plan.id,
        planName: plan.name,
        price,
        period: input.period,
        startDate,
        endDate,
      });
      createBill(userId, id, tool.name, plan.name, price, startDate);
    });

    try {
      tx();
    } catch (err) {
      // 并发重复提交兜底
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        throw AppError.conflict('您已订阅该工具，请勿重复提交');
      }
      throw err;
    }

    return subscriptionRepository.findByIdForUser(id, userId)!;
  },

  /** 取消订阅：仅资源所有者且状态为活跃时可操作 */
  cancel(userId: string, subscriptionId: string): SubscriptionDTO {
    const sub = subscriptionRepository.findByIdForUser(subscriptionId, userId);
    if (!sub) throw AppError.notFound('订阅记录不存在');
    if (sub.status === 'cancelled') {
      throw AppError.conflict('该订阅已取消，无需重复操作');
    }
    if (sub.status === 'expired') {
      throw AppError.conflict('该订阅已过期，可直接续订');
    }
    return subscriptionRepository.cancel(subscriptionId)!;
  },

  /** 续订：仅对已过期/已取消的订阅开放，活跃订阅走取消或自动续费 */
  renew(userId: string, subscriptionId: string, period?: PlanPeriod): SubscriptionDTO {
    const owned = subscriptionRepository.findByIdForUser(subscriptionId, userId);
    if (!owned) throw AppError.notFound('订阅记录不存在');
    if (owned.status === 'active') {
      throw AppError.conflict('订阅仍在有效期内，无需续订');
    }

    // 活跃期间已取消的工具下若产生了新的活跃订阅，则不允许通过旧记录续订
    const activeOther = subscriptionRepository.findActiveByTool(userId, owned.toolId);
    if (activeOther && activeOther.id !== subscriptionId) {
      throw AppError.conflict('您已通过其他记录订阅该工具，请勿重复订阅');
    }

    // 重新校验工具与方案（方案可能已调整，续订按最新价格执行）
    const tool = toolRepository.findById(owned.toolId);
    if (!tool) throw AppError.notFound('工具不存在或已下架');
    const plan = tool.plans.find((p) => p.name === owned.planName) ?? tool.plans[0];
    const nextPeriod: PlanPeriod = period ?? owned.period;
    const price = computePrice(plan.price, nextPeriod);

    const start = new Date();
    const startDate = toDateString(start);
    const endDate = toDateString(addDays(periodDays(nextPeriod), start));

    const db = getDb();
    const tx = db.transaction(() => {
      subscriptionRepository.renew(subscriptionId, {
        planId: plan.id,
        planName: plan.name,
        price,
        period: nextPeriod,
        startDate,
        endDate,
      });
      createBill(userId, subscriptionId, tool.name, plan.name, price, startDate);
    });

    try {
      tx();
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        throw AppError.conflict('您已订阅该工具，请勿重复提交');
      }
      throw err;
    }

    return subscriptionRepository.findByIdForUser(subscriptionId, userId)!;
  },

  /** 开关自动续费：仅活跃订阅可操作 */
  setAutoRenew(userId: string, subscriptionId: string, autoRenew: boolean): SubscriptionDTO {
    const sub = subscriptionRepository.findByIdForUser(subscriptionId, userId);
    if (!sub) throw AppError.notFound('订阅记录不存在');
    if (sub.status !== 'active') {
      throw AppError.conflict('仅活跃订阅可以设置自动续费');
    }
    return subscriptionRepository.setAutoRenew(subscriptionId, autoRenew)!;
  },

  bills(userId: string): BillDTO[] {
    return billRepository.listByUser(userId);
  },

  monthlySpending(userId: string): MonthlySpendingDTO[] {
    return billRepository.monthlySpending(userId);
  },

  categorySpending(userId: string): CategorySpendingDTO[] {
    return billRepository.categorySpending(userId);
  },
};
