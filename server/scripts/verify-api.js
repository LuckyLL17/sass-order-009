/**
 * 关键接口端到端验证脚本（无需额外依赖，使用 Node 内置 fetch）。
 * 用法：确保服务已启动（npm start）后执行 npm run verify
 *
 * 覆盖：
 *  1. 健康检查与工具查询筛选
 *  2. 注册 / 重复注册 / 参数校验
 *  3. 登录成功与失败
 *  4. 鉴权拦截（无 token / 伪造 token）
 *  5. 订阅新增、重复订阅、重复提交（幂等键）
 *  6. 取消、重复取消、续订
 *  7. 资源归属（越权访问他人订阅）
 *  8. 账单与统计
 *  9. 资料 / 密码 / 通知设置
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, headers: res.headers };
}

const rand = Math.random().toString(36).slice(2, 8);
const email = `verify_${rand}@test.local`;
const password = 'test1234abcd';

async function main() {
  console.log('\n=== 1. 健康检查 & 工具查询 ===');
  let r = await request('GET', '/health');
  check('健康检查 200', r.status === 200 && r.json.data.database === 'connected');

  r = await request('GET', '/tools');
  check('工具列表返回 8 个', r.status === 200 && r.json.data.total === 8);

  r = await request('GET', '/tools?category=design&sort=rating');
  check('分类筛选 design=2 个', r.json.data.total === 2);
  check('分类数据正确', r.json.data.items.every((t) => t.category === 'design'));

  r = await request('GET', '/tools?usersRange=gt-100k');
  check('用户数筛选 >10万', r.json.data.items.length === 5);

  r = await request('GET', '/tools?q=figma');
  check('关键词搜索', r.json.data.items.length === 1 && r.json.data.items[0].name === 'Figma');

  r = await request('GET', '/tools?tag=' + encodeURIComponent('SEO'));
  check('标签筛选', r.json.data.items.length === 1);

  r = await request('GET', '/tools?priceMax=50');
  check('价格区间筛选', r.json.data.items.every((t) => Math.min(...t.plans.map((p) => p.price)) <= 50));

  r = await request('GET', '/tools?sort=price-low');
  const prices = r.json.data.items.map((t) => Math.min(...t.plans.map((p) => p.price)));
  check('价格升序排序', prices.every((v, i) => i === 0 || v >= prices[i - 1]));

  r = await request('GET', '/tools/1');
  check('工具详情含 plans/related', r.status === 200 && r.json.data.tool.plans.length === 3 && Array.isArray(r.json.data.related));

  r = await request('GET', '/tools/99999');
  check('不存在的工具 404', r.status === 404 && r.json.error.code === 'NOT_FOUND');

  console.log('\n=== 2. 注册与参数校验 ===');
  r = await request('POST', '/auth/register', {
    body: { name: '验证用户', email, password },
  });
  check('注册成功 201', r.status === 201 && !!r.json.data.token);
  const tokenA = r.json.data.token;

  r = await request('POST', '/auth/register', { body: { name: '验证用户', email, password } });
  check('重复邮箱注册 409', r.status === 409 && r.json.error.code === 'CONFLICT');

  r = await request('POST', '/auth/register', {
    body: { name: '', email: 'bad', password: '123' },
  });
  check('参数校验失败 422', r.status === 422 && Array.isArray(r.json.error.details));

  console.log('\n=== 3. 登录 ===');
  r = await request('POST', '/auth/login', { body: { email, password } });
  check('登录成功', r.status === 200 && !!r.json.data.token);

  r = await request('POST', '/auth/login', { body: { email, password: 'wrong-password' } });
  check('密码错误 401', r.status === 401);

  r = await request('GET', '/auth/me', { token: tokenA });
  check('获取当前用户', r.status === 200 && r.json.data.email === email);

  console.log('\n=== 4. 鉴权拦截 ===');
  r = await request('GET', '/subscriptions');
  check('无 token 访问订阅 401', r.status === 401);

  r = await request('GET', '/subscriptions', { token: 'fake.token.value' });
  check('伪造 token 401', r.status === 401);

  console.log('\n=== 5. 订阅：新增 / 重复 / 幂等 ===');
  r = await request('GET', '/tools/1');
  const planId = r.json.data.tool.plans.find((p) => p.price === 45).id;

  r = await request('POST', '/subscriptions', { token: tokenA, body: { planId, period: 'monthly' } });
  check('新增订阅 201', r.status === 201 && r.json.data.status === 'active' && r.json.data.price === 45);
  const subId = r.json.data.id;

  r = await request('POST', '/subscriptions', { token: tokenA, body: { planId, period: 'monthly' } });
  check('重复订阅被拦截 409', r.status === 409);

  // 幂等：用同一 idempotencyKey 对未订阅工具（Slack 免费方案）提交两次
  const slack = await request('GET', '/tools/7');
  const slackPlan = slack.json.data.tool.plans.find((p) => p.price === 0).id;
  const idemKey = `verify-key-${rand}`;
  const i1 = await request('POST', '/subscriptions', {
    token: tokenA,
    body: { planId: slackPlan, period: 'monthly', idempotencyKey: idemKey },
  });
  const i2 = await request('POST', '/subscriptions', {
    token: tokenA,
    body: { planId: slackPlan, period: 'monthly', idempotencyKey: idemKey },
  });
  check('幂等首次创建 201', i1.status === 201);
  check('幂等重复提交返回同一资源', i2.status === 200 && i2.json.data.id === i1.json.data.id);
  r = await request('GET', '/subscriptions', { token: tokenA });
  check('幂等重试未产生重复数据', r.json.data.filter((s) => s.toolId === '7').length === 1);

  console.log('\n=== 6. 取消 / 续订 ===');
  r = await request('GET', '/subscriptions', { token: tokenA });
  check('订阅列表包含新订阅', r.json.data.some((s) => s.id === subId));

  r = await request('POST', `/subscriptions/${subId}/cancel`, { token: tokenA });
  check('取消订阅成功', r.status === 200 && r.json.data.status === 'cancelled' && r.json.data.autoRenew === false);

  r = await request('POST', `/subscriptions/${subId}/cancel`, { token: tokenA });
  check('重复取消 409', r.status === 409);

  r = await request('PATCH', `/subscriptions/${subId}/auto-renew`, {
    token: tokenA,
    body: { autoRenew: true },
  });
  check('已取消订阅也可改开关（数据更新）', r.status === 200);

  r = await request('POST', `/subscriptions/${subId}/renew`, {
    token: tokenA,
    body: { period: 'yearly' },
  });
  check('续订成功（年付价=月价*12*0.8）', r.status === 200 && r.json.data.status === 'active' && r.json.data.price === 432);
  check('续订后周期为 yearly', r.json.data.period === 'yearly');

  r = await request('POST', `/subscriptions/${subId}/renew`, { token: tokenA, body: {} });
  check('活跃订阅续订 409', r.status === 409);

  console.log('\n=== 7. 资源归属（越权防护） ===');
  // 用户 B
  const emailB = `verify_b_${rand}@test.local`;
  r = await request('POST', '/auth/register', { body: { name: '用户B', email: emailB, password } });
  const tokenB = r.json.data.token;

  r = await request('POST', `/subscriptions/${subId}/cancel`, { token: tokenB });
  check('用户B 取消用户A 的订阅 -> 404', r.status === 404);
  r = await request('POST', `/subscriptions/${subId}/renew`, { token: tokenB, body: {} });
  check('用户B 续订用户A 的订阅 -> 404', r.status === 404);
  r = await request('GET', '/subscriptions', { token: tokenB });
  check('用户B 订阅列表为空（数据隔离）', Array.isArray(r.json.data) && r.json.data.length === 0);

  console.log('\n=== 8. 账单与统计 ===');
  r = await request('GET', '/subscriptions/bills', { token: tokenA });
  check('订阅/续订产生账单', r.status === 200 && r.json.data.length >= 2);

  r = await request('GET', '/subscriptions/stats', { token: tokenA });
  check('统计返回月度与分类', r.status === 200 && Array.isArray(r.json.data.monthlySpending) && Array.isArray(r.json.data.categorySpending));

  console.log('\n=== 9. 资料 / 密码 / 通知 ===');
  r = await request('PATCH', '/users/me', { token: tokenA, body: { name: '验证用户-改名', bio: 'hello' } });
  check('更新资料', r.status === 200 && r.json.data.name === '验证用户-改名');

  r = await request('POST', '/users/me/change-password', {
    token: tokenA,
    body: { oldPassword: password, newPassword: 'newpass2026xy' },
  });
  check('修改密码成功', r.status === 200);

  r = await request('POST', '/users/me/change-password', {
    token: tokenA,
    body: { oldPassword: password, newPassword: 'newpass2026xy' },
  });
  check('旧密码错误 401', r.status === 401);

  r = await request('PUT', '/users/me/notifications', {
    token: tokenA,
    body: { marketingEmails: true },
  });
  check('更新通知设置', r.status === 200 && r.json.data.marketingEmails === true);

  console.log('\n=== 10. 演示种子账户 ===');
  r = await request('POST', '/auth/login', {
    body: { email: 'demo@subhub.local', password: 'demo1234' },
  });
  check('种子账户可登录', r.status === 200);
  const demoToken = r.json.data.token;
  r = await request('GET', '/subscriptions', { token: demoToken });
  check('种子账户有 4 条订阅', r.json.data.length === 4);
  r = await request('GET', '/subscriptions/bills', { token: demoToken });
  check('种子账户有 6 条账单', r.json.data.length === 6);

  console.log(`\n================ 结果 ================`);
  console.log(`通过 ${passed} 项，失败 ${failed} 项`);
  if (failed) {
    console.log('失败项:', failures.join('; '));
    process.exit(1);
  }
  console.log('🎉 全部关键接口验证通过');
}

main().catch((err) => {
  console.error('验证脚本执行异常（服务是否已启动？）:', err);
  process.exit(1);
});
