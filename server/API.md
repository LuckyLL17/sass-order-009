# SubHub API 文档

后端服务地址：`http://localhost:4000`，前端通过 Vite 代理 `/api` 转发。

## 通用约定

### 请求

- 除登录/注册/工具查询等公开接口外，均需在请求头携带：
  ```
  Authorization: Bearer <token>
  ```
- 请求体统一使用 `application/json`。
- 写操作（订阅、续订）可携带 `idempotencyKey` 实现幂等，防止双击/网络重试造成重复提交。

### 统一响应格式

成功：

```json
{ "success": true, "data": { ... } }
```

失败：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数校验失败",
    "details": [{ "field": "email", "message": "邮箱格式不正确" }]
  }
}
```

### 错误码

| HTTP | code | 含义 |
|------|------|------|
| 400 | BAD_REQUEST | 请求参数不合法 |
| 401 | UNAUTHORIZED | 未登录 / token 失效 / 凭证错误 |
| 403 | FORBIDDEN | 无权访问该资源 |
| 404 | NOT_FOUND | 资源不存在（含越权访问他人资源，避免泄露存在性） |
| 409 | CONFLICT | 冲突：邮箱已注册、重复订阅、重复取消等 |
| 422 | VALIDATION_ERROR | 参数校验失败，附字段级 details |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

### CORS

允许的来源在 `server/.env` 的 `CORS_ORIGIN` 配置（逗号分隔），默认放行
`http://localhost:5173` 与 `http://127.0.0.1:5173`，允许携带凭证与
`Content-Type`、`Authorization`、`X-Idempotency-Key` 请求头。

---

## 接口列表

### 系统

#### GET /api/health
健康检查。返回 `{ status, database, time }`。

---

### 鉴权 Auth

#### POST /api/auth/register
注册并自动登录。

请求体：
```json
{ "name": "张三", "email": "zhangsan@example.com", "password": "abc12345" }
```
- `password`：8-64 位，须同时包含字母和数字。

响应 `201`：`{ token, user }`
错误：`409 CONFLICT`（邮箱已注册）、`422 VALIDATION_ERROR`

#### POST /api/auth/login
请求体：`{ "email", "password" }`
响应：`{ token, user }`；凭证错误返回 `401`。

#### GET /api/auth/me  🔐
返回当前登录用户，用于刷新页面后恢复会话。

---

### 用户 Users  🔐（全部需要登录）

#### GET /api/users/me
返回个人资料及 `notificationSettings`。

#### PATCH /api/users/me
更新资料，字段任意组合：`name`、`email`、`phone`、`location`、`bio`、`avatar`。
邮箱与他人冲突时返回 `409`。

#### POST /api/users/me/change-password
`{ "oldPassword", "newPassword" }`；当前密码错误返回 `401`。

#### GET /api/users/me/notifications
返回通知偏好：
`emailNotifications / pushNotifications / subscriptionReminders / marketingEmails / securityAlerts`。

#### PUT /api/users/me/notifications
增量更新上述任意字段（布尔值）。

---

### 工具 Tools（公开，详情/列表支持可选登录态）

#### GET /api/tools
工具查询、筛选与排序。Query 参数：

| 参数 | 说明 | 取值 |
|------|------|------|
| category | 分类 | design / development / marketing / collaboration |
| q | 名称/描述/标签关键词 | 字符串 |
| tag / tags | 标签，tags 逗号分隔表示“且” | 字符串 |
| sort | 排序 | popular（默认）/ rating / price-low / price-high / newest / users-desc / users-asc |
| priceMin / priceMax | 最低价区间（按工具起步价） | 数字 |
| ratingMin | 最低评分 | 0-5 |
| usersRange | 用户数区间 | all / lt-10k / 10k-50k / 50k-100k / gt-100k |
| subscription | 我的订阅状态（**需登录**，否则忽略） | all / subscribed / not-subscribed / expired |

响应：`{ items: Tool[], total }`；登录时每项额外含 `mySubscriptionStatus`。

#### GET /api/tools/meta
返回分类（含计数）、全部标签、价格区间、总数。

#### GET /api/tools/:id
返回 `{ tool, related, mySubscription }`；不存在返回 `404`。

---

### 订阅 Subscriptions  🔐（全部需要登录，且做资源归属校验）

#### GET /api/subscriptions
当前用户的全部订阅，可选 `?status=active|expired|cancelled`。

#### POST /api/subscriptions
新增订阅。
```json
{ "planId": "7", "period": "monthly", "idempotencyKey": "sub-7-monthly-xxxx" }
```
- 年付价格由服务端计算：`月价 × 12 × 0.8`，周期 365 天；月付 30 天。
- 同一用户对同一工具只允许一个活跃订阅：
  - 重复提交返回 `409 CONFLICT`；
  - 相同 `idempotencyKey` 的重试返回首次创建的订阅（`200`，不重复建单）。
- 成功后同步生成一条已支付账单。响应 `201`：`UserSubscription`。

#### PATCH /api/subscriptions/:id/auto-renew
`{ "autoRenew": true|false }`，切换自动续费。

#### POST /api/subscriptions/:id/cancel
取消订阅：`status -> cancelled`、`autoRenew -> false`。
非活跃状态重复取消返回 `409`；操作他人订阅返回 `404`。

#### POST /api/subscriptions/:id/renew
续订已取消/过期订阅，支持 `{ "period", "idempotencyKey" }`，
`status -> active`、日期顺延并生成账单。活跃订阅续订返回 `409`。

#### GET /api/subscriptions/bills
当前用户的账单列表（按日期倒序）。

#### GET /api/subscriptions/stats
基于近 6 个月账单聚合：
```json
{
  "monthlySpending": [{ "month": "4月", "amount": 105 }],
  "categorySpending": [{ "name": "设计工具", "value": 45 }]
}
```

---

## 数据模型（SQLite）

- `users`：账户（邮箱唯一、bcrypt 密码哈希）
- `tools` / `plans`：工具目录与订阅方案（一对多）
- `subscriptions`：用户订阅；部分唯一索引
  `(user_id, tool_id) WHERE status='active'` 从数据库层杜绝重复活跃订阅
- `bills`：账单（items 为 JSON，含 toolId 便于分类统计）
- `notification_settings`：每用户一行的通知偏好
- `idempotency_keys`：写操作幂等记录（key + user_id 主键）

## 安全要点

- 密码使用 bcrypt（10 rounds）哈希存储，接口绝不返回密码字段。
- JWT（HS256，默认 7 天有效），密钥通过环境变量配置。
- 所有订阅操作均校验 `user_id` 归属，越权返回 404。
- zod 统一校验请求体/查询参数，错误以字段级 `details` 返回。
