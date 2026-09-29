/** DB 行 -> API 响应对象（DTO），避免把内部字段（如 password）泄露出去 */
import { all } from '../db/helpers.js';

export function serializePlan(row) {
  return {
    id: String(row.id),
    toolId: String(row.tool_id),
    name: row.name,
    price: row.price,
    period: row.period,
    features: safeParse(row.features, []),
    recommended: !!row.recommended,
  };
}

export function serializeTool(row, plans = null) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    category: row.category,
    logo: row.logo,
    rating: row.rating,
    usersCount: row.users_count,
    features: safeParse(row.features, []),
    screenshots: safeParse(row.screenshots, []),
    tags: safeParse(row.tags, []),
    plans: plans || all('SELECT * FROM plans WHERE tool_id = ? ORDER BY price', [row.id]).map(serializePlan),
  };
}

export function serializeUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    phone: row.phone || '',
    location: row.location || '',
    bio: row.bio || '',
  };
}

export function serializeSubscription(row, tool = null) {
  return {
    id: String(row.id),
    toolId: String(row.tool_id),
    planId: String(row.plan_id),
    toolName: row.tool_name || tool?.name || '',
    toolLogo: row.tool_logo || tool?.logo || '',
    planName: row.plan_name,
    price: row.price,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    autoRenew: !!row.auto_renew,
    createdAt: row.created_at,
  };
}

export function serializeBill(row) {
  return {
    id: String(row.id),
    date: row.date,
    amount: row.amount,
    status: row.status,
    items: safeParse(row.items, []),
  };
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
