# CFpay: Cloudflare Workers 支付宝支付平台模块

## 📋 功能概述
- **创建支付宝支付链接**：调用 `/api/pay/create`，支持指定用户名、会员天数、金额等，返回即时到账支付页面链接。
- **纯 Web Crypto 验签**：底层采用 Worker 原生 Web Crypto 实现 RSA2 验签与私钥签名，零外部复杂依赖。
- **异步回调与自动同步**：接收支付宝 POST `/api/pay/notify` 异步通知，验证通过后自动把 **用户名 / 是否VIP / 支付单号** 提交到 `CFvip` 的 `/api/vip/sync` 接口。

---

## ⚙️ 配置说明

在 `CFpay/wrangler.toml` 中配置你的项目参数：

1. **基本环境变量**：
   - `ALIPAY_APP_ID`: 支付宝开放平台应用 ID
   - `ALIPAY_GATEWAY`: 生产环境保持默认 `https://openapi.alipay.com/gateway.do`；沙箱测试使用 `https://openapi-sandbox.dl.alipaydev.com/gateway.do`
   - `CFVIP_SERVICE_URL`: CFvip 服务的访问 URL，如 `https://cfvip.xxx.workers.dev`
   - `INTERNAL_SECRET`: 与 CFvip 约定的内部通信密钥

2. **配置敏感密钥 (Secrets)**：
   不要将真实私钥明文写入配置文件中，使用 wrangler 命令安全注入：
   ```bash
   # 注入应用私钥 (PKCS8 格式 PEM)
   npx wrangler secret put ALIPAY_PRIVATE_KEY

   # 注入支付宝公钥 (PEM)
   npx wrangler secret put ALIPAY_PUBLIC_KEY
   ```

3. **创建订单 KV**：
   ```bash
   npx wrangler kv:namespace create PAY_KV
   ```
   并将输出的 `id` 填写到 `wrangler.toml` 中。

---

## 🚀 部署步骤

```bash
cd CFpay
npm install
npx wrangler deploy
```

---

## 📡 API 调用流程

### 1. 发起支付 (创建订单)
- **POST** `/api/pay/create`
- **Body**:
  ```json
  {
    "username": "user123",
    "days": 30,
    "amount": "19.90",
    "subject": "HGhubX VIP会员月卡"
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "order_id": "PAY_17322818...",
    "payment_url": "https://openapi.alipay.com/gateway.do?app_id=...",
    "amount": "19.90",
    "username": "user123"
  }
  ```
  前端引导用户跳转至 `payment_url` 完成扫码或登录支付。

### 2. 支付完成回调
- 支付宝回调该 Worker 的 `/api/pay/notify` 接口。
- Worker 完成 RSA2 验签，并将 `{ username, is_vip: true, order_id, trade_no }` 提交给 `CFvip` 模块同步会员权限。
