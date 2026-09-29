/**
 * 关键接口集成测试：使用内存 SQLite，不依赖运行中的服务。
 * 运行：npm test（在 server 目录下）
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initDb, closeDb } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedTools } from '../src/db/seed.js';

const app = createApp();

let token: string;
let otherToken: string;
let subscriptionId: string;

async function registerAndLogin(email: string, password = 'testpass123') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: '测试用户', email, password });
  return res.body.data.token as string;
}

describe('SubHub API', () => {
  before(() => {
    initDb(':memory:');
    runMigrations(false);
    seedTools();
  });

  after(() => {
    closeDb();
  });

  it('健康检查返回 ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ok');
  });

  it('注册参数校验失败返回 400 与字段级错误', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'bad-email', password: '123' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.ok(Array.isArray(res.body.error.details));
    assert.ok(res.body.error.details.length >= 3);
  });

  it('注册成功并返回 token，重复邮箱返回 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '张三', email: 'zhangsan@test.com', password: 'testpass123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'zhangsan@test.com');
    token = res.body.data.token;

    const dup = await request(app)
      .post('/api/auth/register')
      .send({ name: '张三', email: 'zhangsan@test.com', password: 'testpass123' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'CONFLICT');

    otherToken = await registerAndLogin('lisi@test.com');
  });

  it('登录：错误密码 401，正确密码 200', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'zhangsan@test.com', password: 'wrongpass' });
    assert.equal(bad.status, 401);

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'zhangsan@test.com', password: 'testpass123' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.data.token);
  });

  it('GET /auth/me 凭 token 恢复会话，无 token 返回 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'zhangsan@test.com');

    const noToken = await request(app).get('/api/auth/me');
    assert.equal(noToken.status, 401);
  });

  it('工具列表：分类筛选只返回设计类', async () => {
    const res = await request(app).get('/api/tools?category=design');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 2);
    assert.ok(res.body.data.every((t: { category: string }) => t.category === 'design'));
  });

  it('工具列表：关键词搜索 + 价格区间 + 标签 + 排序', async () => {
    const search = await request(app).get('/api/tools?search=figma');
    assert.equal(search.body.data[0].name, 'Figma');

    const free = await request(app).get('/api/tools?priceMin=0&priceMax=0');
    assert.ok(free.body.data.every((t: { plans: { price: number }[] }) =>
      Math.min(...t.plans.map((p) => p.price)) === 0));

    const tagged = await request(app).get('/api/tools?tags=UI设计');
    assert.ok(tagged.body.data.every((t: { tags: string[] }) => t.tags.includes('UI设计')));

    const sorted = await request(app).get('/api/tools?sort=rating');
    const ratings = sorted.body.data.map((t: { rating: number }) => t.rating);
    assert.deepEqual(ratings, [...ratings].sort((a, b) => b - a));
  });

  it('工具详情存在；不存在返回 404', async () => {
    const res = await request(app).get('/api/tools/1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Figma');
    assert.ok(res.body.data.plans.length === 3);

    const missing = await request(app).get('/api/tools/999');
    assert.equal(missing.status, 404);
  });

  it('订阅接口未登录返回 401', async () => {
    const res = await request(app).get('/api/subscriptions');
    assert.equal(res.status, 401);
  });

  it('新增订阅：非法方案返回 400，合法请求 201', async () => {
    const badPlan = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolId: '1', planId: 'not-exist', period: 'monthly' });
    assert.equal(badPlan.status, 400);

    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolId: '4', planId: 'p4-2', period: 'monthly' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.toolName, 'SEMrush');
    assert.equal(res.body.data.price, 249);
    assert.equal(res.body.data.status, 'active');
    subscriptionId = res.body.data.id;
  });

  it('重复订阅同一工具返回 409（防重复提交）', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolId: '4', planId: 'p4-2', period: 'monthly' });
    assert.equal(res.status, 409);
  });

  it('资源归属：其他用户不能操作该订阅（404，不泄露资源存在性）', async () => {
    const res = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`);
    assert.equal(res.status, 404);
  });

  it('年付订阅价格按 8 折计算（129*12*0.8=1238）', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ toolId: '4', planId: 'p4-1', period: 'yearly' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.price, 1238);
    assert.equal(res.body.data.period, 'yearly');
  });

  it('取消订阅：成功后状态为 cancelled，重复取消返回 409', async () => {
    const res = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'cancelled');
    assert.equal(res.body.data.autoRenew, false);

    const again = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(again.status, 409);
  });

  it('非活跃订阅不允许切换自动续费（409）', async () => {
    const res = await request(app)
      .patch(`/api/subscriptions/${subscriptionId}/auto-renew`)
      .set('Authorization', `Bearer ${token}`)
      .send({ autoRenew: true });
    assert.equal(res.status, 409);
  });

  it('续订已取消的订阅：恢复 active、生成新账单', async () => {
    const before = await request(app)
      .get('/api/subscriptions/stats/summary')
      .set('Authorization', `Bearer ${token}`);
    const billsBefore = before.body.data.bills.length;

    const res = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/renew`)
      .set('Authorization', `Bearer ${token}`)
      .send({ period: 'monthly' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.autoRenew, true);

    const after = await request(app)
      .get('/api/subscriptions/stats/summary')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(after.body.data.bills.length, billsBefore + 1);
    assert.ok(Array.isArray(after.body.data.monthlySpending));
    assert.ok(Array.isArray(after.body.data.categorySpending));
  });

  it('活跃订阅可关闭/开启自动续费', async () => {
    const off = await request(app)
      .patch(`/api/subscriptions/${subscriptionId}/auto-renew`)
      .set('Authorization', `Bearer ${token}`)
      .send({ autoRenew: false });
    assert.equal(off.status, 200);
    assert.equal(off.body.data.autoRenew, false);

    const on = await request(app)
      .patch(`/api/subscriptions/${subscriptionId}/auto-renew`)
      .set('Authorization', `Bearer ${token}`)
      .send({ autoRenew: true });
    assert.equal(on.body.data.autoRenew, true);
  });

  it('市场页订阅状态过滤：subscribed 只返回已订阅工具', async () => {
    const res = await request(app)
      .get('/api/tools?subscriptionFilter=subscribed')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((t: { id: string }) => t.id === '4'));
    assert.ok(res.body.data.every((t: { id: string }) => t.id === '4'));
  });

  it('个人资料更新与旧密码修改', async () => {
    const profile = await request(app)
      .put('/api/users/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '张三丰', location: '上海市' });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.name, '张三丰');

    const wrongOld = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'nope', newPassword: 'newpass1234' });
    assert.equal(wrongOld.status, 400);

    const ok = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'testpass123', newPassword: 'newpass1234' });
    assert.equal(ok.status, 200);

    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'zhangsan@test.com', password: 'newpass1234' });
    assert.equal(relogin.status, 200);
  });

  it('不存在的接口返回 404 标准格式', async () => {
    const res = await request(app).get('/api/no-such-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
