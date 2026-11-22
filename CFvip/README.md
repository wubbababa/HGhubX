# CFvip: Cloudflare Worker VIP判定与同步模块

## 📋 功能概述
- **判断是否为 VIP**：客户端或业务端调用 `/api/vip/check?username=xxx` 快速读取用户的 VIP 状态与有效期。
- **接收支付同步**：提供内部受保护接口 `/api/vip/sync`，供 `CFpay` 支付平台在收到支付宝异步通知并验签成功后，同步 **用户名、是否VIP、支付单号**。
- **持久化保存**：基于 Cloudflare KV 存储。

---

## 🚀 部署步骤

1. **进入目录**：
   ```bash
   cd CFvip
   npm install
   ```

2. **创建 KV 命名空间**：
   ```bash
   npx wrangler kv:namespace create VIP_KV
   ```
   记录命令输出的 `id`，并填入 `wrangler.toml` 中的 `id` 字段。

3. **配置密钥**：
   在 `wrangler.toml` 中配置 `INTERNAL_SECRET`（或通过 `npx wrangler secret put INTERNAL_SECRET` 设置加密环境变量），确保与 `CFpay` 中的一致。

4. **部署上线**：
   ```bash
   npx wrangler deploy
   ```

---

## 📡 API 接口规范

### 1. 查询用户是否为 VIP
- **请求方式**：`GET`
- **路径**：`/api/vip/check?username={用户名}`
- **响应示例**：
  ```json
  {
    "ok": true,
    "username": "user123",
    "is_vip": true,
    "expire_at": 1735100000000,
    "order_id": "ORD20261122...",
    "updated_at": "2026-11-22T13:20:00.000Z"
  }
  ```

### 2. 支付成功同步接口 (供 CFpay 调用)
- **请求方式**：`POST`
- **路径**：`/api/vip/sync`
- **Header**：`X-Internal-Secret: <your_secret>`
- **Body 参数**：
  ```json
  {
    "username": "user123",
    "is_vip": true,
    "order_id": "PAY_20261122_123456",
    "trade_no": "2026112222001400...",
    "days": 30
  }
  ```
- **响应示例**：
  ```json
  {
    "ok": true,
    "message": "VIP状态同步成功",
    "data": { ... }
  }
  ```
