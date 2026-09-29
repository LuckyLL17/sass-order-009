/**
 * 种子数据：
 * - 8 个工具（含方案、特性、标签、截图），与前端初始 Mock 一致
 * - 演示账号 demo@subhub.com / demo1234（3 个活跃订阅 + 1 个过期订阅 + 近 6 个月账单）
 *
 * 重复执行会幂等跳过（INSERT OR IGNORE / 存在即跳过）。
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';
import { runMigrations } from './migrate.js';
import { addDays, toDateString } from '../utils/date.js';

const IMG_BASE =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=';
const img = (prompt: string, size = 'square') =>
  `${IMG_BASE}${encodeURIComponent(prompt)}&image_size=${size}`;
const shot = (prompt: string) => img(prompt, 'landscape_16_9');

interface SeedPlan {
  id: string;
  name: string;
  price: number;
  recommended?: boolean;
  features: string[];
}

interface SeedTool {
  id: string;
  name: string;
  description: string;
  category: 'design' | 'development' | 'marketing' | 'collaboration';
  logoPrompt: string;
  rating: number;
  usersCount: number;
  tags: string[];
  features: string[];
  screenshots: string[];
  plans: SeedPlan[];
}

const tools: SeedTool[] = [
  {
    id: '1',
    name: 'Figma',
    description: '协作式界面设计工具，让团队成员实时协作完成UI/UX设计',
    category: 'design',
    logoPrompt: 'figma logo minimal design gradient',
    rating: 4.9,
    usersCount: 125000,
    tags: ['UI设计', '原型', '协作'],
    features: ['实时协作编辑', '组件库管理', '原型交互动效', '设计系统支持', '开发人员模式', '版本历史记录'],
    screenshots: [
      shot('figma design interface dark theme ui ux'),
      shot('figma collaboration workspace multiple users'),
      shot('figma component library design system'),
    ],
    plans: [
      { id: 'p1-1', name: 'Starter', price: 0, features: ['3个文件', '基础组件', '2个编辑者'] },
      { id: 'p1-2', name: 'Professional', price: 45, recommended: true, features: ['无限文件', '高级组件', '无限编辑者', '团队库', '版本历史'] },
      { id: 'p1-3', name: 'Organization', price: 90, features: ['所有专业功能', 'SSO单点登录', '高级分析', '专属支持'] },
    ],
  },
  {
    id: '2',
    name: 'GitHub Pro',
    description: '全球最大的代码托管平台，专业版提供高级协作和安全功能',
    category: 'development',
    logoPrompt: 'github logo minimal dark theme',
    rating: 4.8,
    usersCount: 89000,
    tags: ['代码托管', 'CI/CD', '项目管理'],
    features: ['无限私有仓库', 'GitHub Actions CI/CD', '代码审查工具', '安全漏洞扫描', '项目看板', 'Wiki文档'],
    screenshots: [
      shot('github repository dashboard dark mode'),
      shot('github actions workflow ci cd'),
      shot('github pull request code review'),
    ],
    plans: [
      { id: 'p2-1', name: 'Free', price: 0, features: ['无限公共仓库', '500MB存储', '社区支持'] },
      { id: 'p2-2', name: 'Pro', price: 32, recommended: true, features: ['无限私有仓库', '2GB存储', '高级支持', '代码审查'] },
      { id: 'p2-3', name: 'Team', price: 68, features: ['所有Pro功能', '团队管理', 'SAML SSO', '审计日志'] },
    ],
  },
  {
    id: '3',
    name: 'Notion',
    description: '一体化的工作空间，融合笔记、文档、数据库和项目管理',
    category: 'collaboration',
    logoPrompt: 'notion logo minimal black white',
    rating: 4.7,
    usersCount: 156000,
    tags: ['笔记', '项目管理', '知识库'],
    features: ['块级编辑', '数据库视图', '模板市场', '团队协作', 'API集成', '离线支持'],
    screenshots: [
      shot('notion workspace dashboard productivity'),
      shot('notion database table view project management'),
      shot('notion team collaboration workspace'),
    ],
    plans: [
      { id: 'p3-1', name: 'Free', price: 0, features: ['无限页面', '5MB上传限制', '基础集成'] },
      { id: 'p3-2', name: 'Plus', price: 28, recommended: true, features: ['无限上传', '版本历史', '优先支持', '高级块'] },
      { id: 'p3-3', name: 'Business', price: 58, features: ['所有Plus功能', 'SSO', '高级分析', '专属客户经理'] },
    ],
  },
  {
    id: '4',
    name: 'SEMrush',
    description: '全方位的数字营销工具套件，助力SEO、内容营销和竞争分析',
    category: 'marketing',
    logoPrompt: 'semrush logo orange gradient marketing',
    rating: 4.6,
    usersCount: 67000,
    tags: ['SEO', '关键词研究', '竞品分析'],
    features: ['关键词研究', '网站审计', '竞品分析', '内容优化', '社交媒体管理', 'PPC广告分析'],
    screenshots: [
      shot('semrush seo dashboard analytics marketing'),
      shot('semrush keyword research tool interface'),
      shot('semrush competitor analysis report'),
    ],
    plans: [
      { id: 'p4-1', name: 'Pro', price: 129, features: ['5个项目', '10000关键词', '基础报告'] },
      { id: 'p4-2', name: 'Guru', price: 249, recommended: true, features: ['50个项目', '50000关键词', '高级分析', '内容模板'] },
      { id: 'p4-3', name: 'Business', price: 499, features: ['所有Guru功能', 'API访问', '白标报告', '培训服务'] },
    ],
  },
  {
    id: '5',
    name: 'VS Code Pro',
    description: '专业版代码编辑器，集成AI辅助、高级调试和团队协作功能',
    category: 'development',
    logoPrompt: 'vscode logo blue gradient minimal',
    rating: 4.9,
    usersCount: 234000,
    tags: ['代码编辑', 'AI编程', '调试'],
    features: ['智能代码补全', 'AI结对编程', '高级调试器', 'Git集成', '远程开发', '插件市场'],
    screenshots: [
      shot('vscode code editor dark theme programming'),
      shot('vscode ai copilot code completion'),
      shot('vscode debugger interface breakpoints'),
    ],
    plans: [
      { id: 'p5-1', name: 'Free', price: 0, features: ['基础编辑', '核心调试', '社区插件'] },
      { id: 'p5-2', name: 'Pro', price: 19, recommended: true, features: ['AI辅助编程', '高级调试', '优先更新', '专业主题'] },
      { id: 'p5-3', name: 'Enterprise', price: 49, features: ['所有Pro功能', '企业安全', '集中管理', '专属支持'] },
    ],
  },
  {
    id: '6',
    name: 'Adobe Creative Cloud',
    description: '全套创意设计工具，包括Photoshop、Illustrator、Premiere等',
    category: 'design',
    logoPrompt: 'adobe creative cloud logo colorful gradient',
    rating: 4.8,
    usersCount: 198000,
    tags: ['图像处理', '视频剪辑', '平面设计'],
    features: ['Photoshop', 'Illustrator', 'Premiere Pro', 'After Effects', 'Lightroom', 'Adobe Fonts'],
    screenshots: [
      shot('adobe photoshop interface photo editing'),
      shot('adobe illustrator graphic design workspace'),
      shot('adobe premiere pro video editing timeline'),
    ],
    plans: [
      { id: 'p6-1', name: 'Single App', price: 89, features: ['单个应用', '100GB云存储', '基础支持'] },
      { id: 'p6-2', name: 'All Apps', price: 199, recommended: true, features: ['全部20+应用', '1TB云存储', '高级字体', 'Stock素材'] },
      { id: 'p6-3', name: 'Creative Cloud for Teams', price: 349, features: ['所有功能', '团队管理', '企业级安全', '培训资源'] },
    ],
  },
  {
    id: '7',
    name: 'Slack',
    description: '团队沟通协作平台，集成多种工作工具，提升团队效率',
    category: 'collaboration',
    logoPrompt: 'slack logo colorful hashtag minimal',
    rating: 4.7,
    usersCount: 178000,
    tags: ['即时通讯', '团队协作', '工具集成'],
    features: ['频道组织', '视频会议', '文件共享', '1000+集成', '消息搜索', '移动端支持'],
    screenshots: [
      shot('slack interface team chat channels'),
      shot('slack video conference meeting'),
      shot('slack app integrations dashboard'),
    ],
    plans: [
      { id: 'p7-1', name: 'Free', price: 0, features: ['10个应用集成', '5GB存储', '基础搜索'] },
      { id: 'p7-2', name: 'Pro', price: 25, recommended: true, features: ['无限集成', '10GB/用户', '高级搜索', '视频会议'] },
      { id: 'p7-3', name: 'Business+', price: 45, features: ['所有Pro功能', 'SAML SSO', '合规导出', '24/7支持'] },
    ],
  },
  {
    id: '8',
    name: 'HubSpot',
    description: '一站式CRM和营销自动化平台，助力企业获客和客户管理',
    category: 'marketing',
    logoPrompt: 'hubspot logo orange gradient crm',
    rating: 4.5,
    usersCount: 92000,
    tags: ['CRM', '营销自动化', '销售管理'],
    features: ['客户关系管理', '营销自动化', '销售漏斗', '客户服务', '数据分析', '表单构建'],
    screenshots: [
      shot('hubspot crm dashboard sales pipeline'),
      shot('hubspot marketing automation workflow'),
      shot('hubspot analytics report dashboard'),
    ],
    plans: [
      { id: 'p8-1', name: 'Starter', price: 49, features: ['基础CRM', '邮件营销', '表单工具'] },
      { id: 'p8-2', name: 'Professional', price: 179, recommended: true, features: ['营销自动化', 'A/B测试', '高级报告', '多触点归因'] },
      { id: 'p8-3', name: 'Enterprise', price: 499, features: ['所有功能', '自定义对象', '高级安全', '专属成功经理'] },
    ],
  },
];

export function seedTools() {
  const db = getDb();
  const insertTool = db.prepare(
    `INSERT OR IGNORE INTO tools (id, name, description, category, logo, rating, users_count, sort_order)
     VALUES (@id, @name, @description, @category, @logo, @rating, @usersCount, @sortOrder)`
  );
  const insertFeature = db.prepare(
    'INSERT INTO tool_features (tool_id, content, position) VALUES (?, ?, ?)'
  );
  const insertScreenshot = db.prepare(
    'INSERT INTO tool_screenshots (tool_id, url, position) VALUES (?, ?, ?)'
  );
  const insertTag = db.prepare('INSERT INTO tool_tags (tool_id, tag) VALUES (?, ?)');
  const insertPlan = db.prepare(
    `INSERT OR IGNORE INTO plans (id, tool_id, name, price, period, recommended, position)
     VALUES (@id, @toolId, @name, @price, 'monthly', @recommended, @position)`
  );
  const insertPlanFeature = db.prepare(
    'INSERT INTO plan_features (plan_id, content, position) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    tools.forEach((tool, index) => {
      const result = insertTool.run({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        logo: img(tool.logoPrompt),
        rating: tool.rating,
        usersCount: tool.usersCount,
        sortOrder: index,
      });
      // 新插入时补关联数据；已存在则跳过，保证种子幂等
      if (result.changes === 0) return;

      tool.features.forEach((f, i) => insertFeature.run(tool.id, f, i));
      tool.screenshots.forEach((s, i) => insertScreenshot.run(tool.id, s, i));
      tool.tags.forEach((t) => insertTag.run(tool.id, t));

      tool.plans.forEach((plan, i) => {
        insertPlan.run({
          id: plan.id,
          toolId: tool.id,
          name: plan.name,
          price: plan.price,
          recommended: plan.recommended ? 1 : 0,
          position: i,
        });
        plan.features.forEach((f, fi) => insertPlanFeature.run(plan.id, f, fi));
      });
    });
  });
  tx();
  console.log(`✓ 已写入 ${tools.length} 个工具及方案数据`);
}

export function seedDemoUser() {
  const db = getDb();
  const email = 'demo@subhub.com';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
    | { id: string }
    | undefined;
  if (existing) {
    console.log('✓ 演示账号已存在，跳过');
    return;
  }

  const userId = `user_demo_${randomUUID().slice(0, 8)}`;
  const passwordHash = bcrypt.hashSync('demo1234', 10);

  const now = new Date();
  // 活跃订阅：一年前开始、一年后到期；过期订阅：两年前开始、一年前到期
  const activeStart = toDateString(addDays(-365, now));
  const activeEnd = toDateString(addDays(365, now));
  const expiredStart = toDateString(addDays(-730, now));
  const expiredEnd = toDateString(addDays(-365, now));

  const demoSubs = [
    { toolId: '1', planId: 'p1-2', planName: 'Professional', price: 45, status: 'active', start: activeStart, end: activeEnd, autoRenew: 1 },
    { toolId: '2', planId: 'p2-2', planName: 'Pro', price: 32, status: 'active', start: activeStart, end: activeEnd, autoRenew: 1 },
    { toolId: '3', planId: 'p3-2', planName: 'Plus', price: 28, status: 'active', start: activeStart, end: activeEnd, autoRenew: 1 },
    { toolId: '5', planId: 'p5-2', planName: 'Pro', price: 19, status: 'expired', start: expiredStart, end: expiredEnd, autoRenew: 0 },
  ];

  const insertSub = db.prepare(
    `INSERT INTO subscriptions
       (id, user_id, tool_id, plan_id, plan_name, price, period, status, auto_renew, start_date, end_date)
     VALUES
       (@id, @userId, @toolId, @planId, @planName, @price, 'monthly', @status, @autoRenew, @start, @end)`
  );
  const insertBill = db.prepare(
    `INSERT INTO bills (id, user_id, subscription_id, amount, status, bill_date)
     VALUES (?, ?, ?, ?, 'paid', ?)`
  );
  const insertBillItem = db.prepare(
    'INSERT INTO bill_items (bill_id, name, quantity, price) VALUES (?, ?, 1, ?)'
  );

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, name, email, password, avatar, phone, location, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      '演示用户',
      email,
      passwordHash,
      img('professional asian male avatar portrait simple'),
      '138****8888',
      '北京市',
      '热爱技术，专注于产品设计和用户体验。'
    );

    const subIds: Record<string, string> = {};
    for (const s of demoSubs) {
      const id = `sub_demo_${s.toolId}_${randomUUID().slice(0, 6)}`;
      subIds[s.toolId] = id;
      insertSub.run({
        id,
        userId,
        toolId: s.toolId,
        planId: s.planId,
        planName: s.planName,
        price: s.price,
        status: s.status,
        autoRenew: s.autoRenew,
        start: s.start,
        end: s.end,
      });
    }

    // 近 6 个月账单：最近两月仅 3 个活跃订阅，之前含 VS Code Pro
    for (let i = 5; i >= 0; i--) {
      const billDate = toDateString(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const active = demoSubs.filter((s) => (i <= 1 ? s.status === 'active' : true));
      const amount = active.reduce((sum, s) => sum + s.price, 0);
      const billId = `bill_demo_${i}_${randomUUID().slice(0, 6)}`;
      const firstSubId = subIds[active[0].toolId];
      insertBill.run(billId, userId, firstSubId, amount, billDate);
      for (const s of active) {
        const tool = tools.find((t) => t.id === s.toolId)!;
        insertBillItem.run(billId, `${tool.name} ${s.planName}`, s.price);
      }
    }
  });
  tx();
  console.log(`✓ 已创建演示账号: ${email} / demo1234`);
}

export function seedAll() {
  runMigrations(false);
  seedTools();
  seedDemoUser();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll();
  console.log('种子数据写入完成');
}
