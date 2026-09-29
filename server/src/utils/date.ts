/** 日期统一使用 YYYY-MM-DD（UTC），与前端既有展示格式保持一致 */
export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function addDays(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function periodDays(period: 'monthly' | 'yearly'): number {
  return period === 'yearly' ? 365 : 30;
}

/** 依据 end_date 派生订阅状态（已取消以显式状态为准） */
export function deriveStatus(
  rawStatus: string,
  endDate: string,
  now: Date = new Date()
): 'active' | 'expired' | 'cancelled' {
  if (rawStatus === 'cancelled') return 'cancelled';
  return new Date(endDate).getTime() < now.getTime() ? 'expired' : 'active';
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
