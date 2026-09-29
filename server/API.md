# SubHub API 文档

订阅工具聚合平台后端服务，基于 **Express + TypeScript + better-sqlite3（SQLite）+ JWT + Zod**。

- 默认地址：`http://localhost:4000`
- 前端开发环境通过 Vite 代理 `/api` → `http://localhost:4000`
- 所有响应统一为 JSON 格式

## 快速开始

```bash
cd server
cp .env.example .env        # 按需修改端口 / JWT 密钥 / CORS
npm install
npm run migrate             # 建表（迁移记录保证幂等）
npm run seed                # 写入 8 个工具 + 演示账号
npm run dev                 # 启动开发服务（tsx watch）
```

演示账号：`demo@subhub.com` / `demo1234`

重置数据库：`npm run db:reset`

## 统一约定

### 成功响应

```json
{ "success": true, "data": { ... } }
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "参数校验失败",
    "details": [{ "field": "email", "message": "邮箱格式不正确" }]
  }
}
```

| HTTP 状态码 | code | 场景 |
|---|---|---|
| 400 | `BAD_REQUEST` | 参数校验失败、业务前置条件不满足 |
| 401 | `UNAUTHORIZED` | 未登录、token 失效、邮箱或密码错误 |
| 403 | `FORBIDDEN` | 无权访问 |
| 404 | `NOT_FOUND` | 资源不存在（含归属他人的资源，不泄露存在性） |
| 409 | `CONFLICT` | 邮箱重复、重复订阅、重复取消等 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 鉴权

除注册、登录、工具查询外，接口均需请求头：

```
Authorization: Bearer <token>
```

token 在注册/登录成功后返回，有效期默认 7 天（`JWT_EXPIRES_IN`）。

## 接口列表

### 健康检查

#### `GET /health`

无需鉴权，返回服务状态。

---

### 认证 `/api/auth`

#### `POST /api/auth/register`

注册并直接登录，返回 JWT。

请求体：

| 字段 | 类型 | 规则 |
|---|---|---|
| name | string | 必填，1-30 字符 |
| email | string | 必填，合法邮箱（自动转小写） |
| password | string | 必填，8-64 字符 |

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"张三","email":"zhangsan@test.com","password":"testpass123"}'
```

响应 `201`：

```json
{ "success": true, "data": { "token": "eyJ...", "user": { "id": "...", "name": "张三", "email": "..." } } }
```

#### `POST /api/auth/login`

请求体：`{ "email": "...", "password": "..." }` → `200` 返回 `{ token, user }`。
错误凭证统一返回 `401 邮箱或密码不正确`（不暴露邮箱是否存在）。

#### `GET /api/auth/me`

需鉴权。用于刷新页面后恢复登录态，返回当前用户信息。

---

### 工具 `/api/tools`（查询/筛选）

#### `GET /api/tools`

公开接口（带 token 时支持订阅状态过滤）。所有筛选条件均为可选 query 参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| category | string | `design` / `development` / `marketing` / `collaboration` / `all` |
| search | string | 模糊匹配名称、描述、标签 |
| sort | string | `popular`(默认) / `rating` / `newest` / `price-low` / `price-high` / `users-desc` / `users-asc` |
| priceMin, priceMax | number | 按工具最低月付价过滤 |
| ratingMin | number | 0-5 |
| usersRange | string | `all` / `lt-10k` / `10k-50k` / `50k-100k` / `gt-100k` |
| tags | string | 逗号分隔，多个标签为 AND 关系，如 `tags=UI设计,协作` |
| subscriptionFilter | string | `all` / `subscribed` / `not-subscribed` / `expired`（需登录） |

```bash
curl "http://localhost:4000/api/tools?category=design&sort=rating&priceMin=0&priceMax=200"
```

#### `GET /api/tools/meta`

返回工具总数、全部标签、各分类计数（供筛选面板使用）。

#### `GET /api/tools/:id`

返回单个工具（含方案、特性、截图、标签）；不存在返回 `404`。

---

### 订阅 `/api/subscriptions`（均需鉴权，按资源归属隔离）

#### `GET /api/subscriptions`

返回当前用户的全部订阅。可选 `?status=active|expired|cancelled`。
服务端按 `end_date` 派生过期状态；订阅仅返回属于当前用户的记录。

#### `POST /api/subscriptions` —— 新增订阅

请求体：

| 字段 | 类型 | 规则 |
|---|---|---|
| toolId | string | 必填，工具必须存在 |
| planId | string | 必填，必须属于该工具 |
| period | string | `monthly` / `yearly` |

业务规则：

- 同一用户对同一工具仅允许一份 **活跃** 订阅（服务层校验 + 数据库部分唯一索引双重防重）。
- 价格由服务端按方案月价计算：年付 = `round(月价 × 12 × 0.8)`，不信任前端传价。
- 成功后同事务生成一张 `paid` 账单。

成功 `201`，重复提交 `409`，方案与工具不匹配 `400`。

```bash
curl -X POST http://localhost:4000/api/subscriptions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toolId":"4","planId":"p4-2","period":"monthly"}'
```

#### `POST /api/subscriptions/:id/cancel` —— 取消订阅

仅所有者可操作；取消后 `status=cancelled`、`autoRenew=false`。
对他人资源返回 `404`（防越权探测）；已取消/已过期返回 `409`。

#### `POST /api/subscriptions/:id/renew` —— 续订

仅 `expired/cancelled` 订阅可续订，活跃订阅返回 `409`。
请求体可选 `{ "period": "monthly" }`（默认沿用原周期）。续订按方案最新价格计费，重置周期为今日起 30/365 天，并生成新账单。

#### `PATCH /api/subscriptions/:id/auto-renew`

请求体 `{ "autoRenew": true | false }`，仅活跃订阅可设置，否则 `409`。

#### `GET /api/subscriptions/stats/summary`

返回当前用户的账单列表、近 6 个月支出、按分类的月均支出：

```json
{
  "bills": [{ "id": "...", "date": "2026-09-29", "amount": 249, "status": "paid",
              "items": [{ "name": "SEMrush Guru", "quantity": 1, "price": 249 }] }],
  "monthlySpending": [{ "month": "4月", "amount": 0 }],
  "categorySpending": [{ "name": "营销工具", "value": 199.17 }]
}
```

---

### 用户 `/api/users`（均需鉴权）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/users/me/profile` | 获取通知设置等资料元数据 |
| PUT | `/api/users/me/profile` | 更新姓名/邮箱/头像/手机/地区/简介；邮箱冲突返回 409 |
| PUT | `/api/users/me/password` | `{oldPassword,newPassword}`，校验旧密码（bcrypt），新旧不能相同 |
| PUT | `/api/users/me/notification-settings` | 增量更新通知开关，持久化到数据库 |

## 数据模型

```
users 1───* subscriptions *───1 tools
                │                    │
                │                    ├── plans 1──* plan_features
                ├── 1──* bills       ├── tool_features
                         └──* bill_items
                (另有 tool_tags / tool_screenshots)
```

- 密码：bcrypt（cost=10）哈希存储，不存明文。
- 防重：`subscriptions` 上存在部分唯一索引
  `UNIQUE(user_id, tool_id) WHERE status='active'`，并发请求也会被数据库拦截（409）。
- 越权：所有订阅操作都以 `id + user_id` 双重定位。
- 日期：统一 `YYYY-MM-DD`（UTC），时间戳用 SQLite `datetime('now')`。

## 测试

```bash
npm test          # node:test + supertest，内存 SQLite，共 20 个用例
```

覆盖：注册/登录/参数校验/重复邮箱、token 恢复、工具各类筛选与排序、
新增订阅（含年付计价）、重复订阅 409、跨用户越权 404、
取消/重复取消、续订与账单生成、自动续费开关、资料与改密、404 兜底。

## 环境变量（server/.env）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `4000` | 服务端口 |
| `DATABASE_FILE` | `./data/subhub.db` | SQLite 文件路径 |
| `JWT_SECRET` | 开发占位值 | **生产环境必须替换** |
| `JWT_EXPIRES_IN` | `7d` | token 有效期 |
| `CORS_ORIGIN` | `http://localhost:5173,...` | 允许来源白名单，逗号分隔，`*` 为全部允许 |
| `NODE_ENV` | `development` | 运行环境 |
