/**
 * 种子数据脚本（幂等，可重复执行）。
 * 用法：node src/db/seed.js
 * 会自动确保表结构存在，然后写入工具目录、演示用户、订阅和账单。
 */
import bcrypt from 'bcryptjs';
import { run, transaction, closeDatabase } from './index.js';
import { get } from './helpers.js';
import { migrate } from './migrate.js';
import { seedTools, DEFAULT_AVATAR } from './seed-data.js';
import { config } from '../config.js';

const dayMs = 24 * 60 * 60 * 1000;
const fmt = (d) => d.toISOString().split('T')[0];
/** 账单条目展示名：工具名已包含方案名时不再拼接（如 “GitHub Pro” + “Pro”） */
const planDisplayName = (toolName, planName) =>
  toolName.includes(planName) ? toolName : `${toolName} ${planName}`;

function seedToolsCatalog() {
  const row = get('SELECT COUNT(*) AS c FROM tools');
  if (row.c > 0) {
    console.log('↺  工具目录已存在，跳过');
    return;
  }

  transaction(() => {
    seedTools.forEach((tool, idx) => {
      const info = run(
        `INSERT INTO tools (name, description, category, logo, rating, users_count, features, screenshots, tags, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tool.name,
          tool.description,
          tool.category,
          tool.logo,
          tool.rating,
          tool.usersCount,
          JSON.stringify(tool.features),
          JSON.stringify(tool.screenshots),
          JSON.stringify(tool.tags),
          idx,
        ]
      );
      const toolId = info.lastInsertRowid;
      tool.plans.forEach((plan) => {
        run(
          `INSERT INTO plans (tool_id, plan_key, name, price, period, features, recommended)
           VALUES (?, ?, ?, ?, 'monthly', ?, ?)`,
          [toolId, plan.planKey, plan.name, plan.price, JSON.stringify(plan.features), plan.recommended ? 1 : 0]
        );
      });
    });
  });
  console.log(`✅ 已写入 ${seedTools.length} 个工具及其订阅方案`);
}

function seedDemoUser() {
  const { name, email, password } = config.seedUser;

  let user = get('SELECT id FROM users WHERE email = ?', [email]);
  if (!user) {
    const hash = bcrypt.hashSync(password, 10);
    const info = run(
      `INSERT INTO users (name, email, password, avatar, phone, location, bio)
       VALUES (?, ?, ?, ?, '138****8888', '北京市', '热爱技术，专注于产品设计和用户体验。致力于通过工具提升团队效率。')`,
      [name, email, hash, DEFAULT_AVATAR]
    );
    user = { id: info.lastInsertRowid };
    console.log(`✅ 已创建演示用户 ${email} / ${password}`);
  } else {
    console.log('↺  演示用户已存在，跳过');
  }

  run(`INSERT OR IGNORE INTO notification_settings (user_id) VALUES (?)`, [user.id]);
  return user.id;
}

function seedSubscriptionsAndBills(userId) {
  const row = get('SELECT COUNT(*) AS c FROM subscriptions WHERE user_id = ?', [userId]);
  if (row.c > 0) {
    console.log('↺  订阅与账单已存在，跳过');
    return;
  }

  const now = new Date();
  const activeSpecs = [
    { tool: 'Figma', plan: 'Professional' },
    { tool: 'GitHub Pro', plan: 'Pro' },
    { tool: 'Notion', plan: 'Plus' },
  ];
  const activeRows = [];

  transaction(() => {
    activeSpecs.forEach((spec, i) => {
      const tool = get('SELECT id FROM tools WHERE name = ?', [spec.tool]);
      const plan = get('SELECT * FROM plans WHERE tool_id = ? AND name = ?', [tool.id, spec.plan]);
      const start = new Date(now.getTime() - (90 + i * 30) * dayMs);
      const end = new Date(now.getTime() + (330 - i * 20) * dayMs);
      const info = run(
        `INSERT INTO subscriptions
           (user_id, tool_id, plan_id, plan_name, price, period, status, auto_renew, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, 'monthly', 'active', 1, ?, ?)`,
        [userId, tool.id, plan.id, plan.name, plan.price, fmt(start), fmt(end)]
      );
      activeRows.push({
        toolId: String(tool.id),
        name: planDisplayName(spec.tool, spec.plan),
        price: plan.price,
      });
    });

    // 一条已过期订阅（VS Code Pro，约 35 天前到期）
    const vscode = get('SELECT id FROM tools WHERE name = ?', ['VS Code Pro']);
    const vscodePlan = get('SELECT * FROM plans WHERE tool_id = ? AND name = ?', [vscode.id, 'Pro']);
    run(
      `INSERT INTO subscriptions
         (user_id, tool_id, plan_id, plan_name, price, period, status, auto_renew, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, 'monthly', 'expired', 0, ?, ?)`,
      [
        userId,
        vscode.id,
        vscodePlan.id,
        vscodePlan.name,
        vscodePlan.price,
        fmt(new Date(now.getTime() - 400 * dayMs)),
        fmt(new Date(now.getTime() - 35 * dayMs)),
      ]
    );

    // 近 6 个月账单：前 4 个月含 VS Code Pro，近 2 个月不含
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const items = activeRows.map((r) => ({ toolId: r.toolId, name: r.name, quantity: 1, price: r.price }));
      if (i >= 2)
        items.push({
          toolId: String(vscode.id),
          name: planDisplayName('VS Code Pro', vscodePlan.name),
          quantity: 1,
          price: vscodePlan.price,
        });
      const amount = items.reduce((s, it) => s + it.price * it.quantity, 0);
      run(
        `INSERT INTO bills (user_id, date, amount, status, items) VALUES (?, ?, ?, 'paid', ?)`,
        [userId, fmt(d), amount, JSON.stringify(items)]
      );
    }
  });

  console.log('✅ 已写入演示订阅（3 个活跃 + 1 个过期）和近 6 个月账单');
}

async function seed() {
  // migrate 会初始化数据库并保持连接打开
  await migrate();
  seedToolsCatalog();
  const userId = seedDemoUser();
  seedSubscriptionsAndBills(userId);
  console.log('\n🌱 种子数据就绪。登录信息见 server/.env（默认 demo@subhub.local / demo1234）');
}

seed()
  .then(() => closeDatabase())
  .catch((err) => {
    console.error('❌ 种子数据写入失败:', err);
    process.exit(1);
  });
