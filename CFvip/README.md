# CFvip: Cloudflare Worker VIP判定、同步与管理后台

## 📋 功能概述
- **管理后台页面**：直接访问 `/admin` 即可打开现代化 VIP 用户管理面板。
- **手动设置 VIP**：支持在后台输入用户名、自选开通/取消、快捷设置开通天数（7天、30天月卡、90天季卡、365年卡、永久VIP），并在已有有效期基础上自动顺延，支持添加操作备注。
- **用户列表与快捷操作**：后台实时展示 KV 存储中的 VIP 用户列表、到期时间、状态 Badge，并提供"编辑"、"取消 VIP"及"快捷续费"操作。
- **快速查询**：可在后台输入任意用户名一键核查 VIP 状态及到期时间。
- **支付参数配置**：管理后台支持可视化配置支付开关、支付方式、网关地址、支付宝参数、回调地址及 VIP 套餐列表，配置持久存储在 KV 中。
- **判断是否为 VIP**：公开接口 `/api/vip/check?username=xxx` 供客户端或业务系统快速读取 VIP 状态。
- **接收支付同步**：受保护接口 `/api/vip/sync` 供支付平台（如 `CFpay`）在支付成功后自动同步 VIP。

---

## 🖥️ 管理后台使用说明

1. 访问地址：`https://<你的CFvip域名>/admin`
2. **密钥鉴权**：
   - 首次进入管理页面，请在页面右上角的「输入管理密钥」处输入 `wrangler.toml` 中配置的 `INTERNAL_SECRET`。
   - 点击「保存密钥」后，密钥将持久保存在本地浏览器 LocalStorage 中，后续自动携带该密钥调用管理接口。

---

## 📡 管理与业务 API 说明

### 1. 管理后台页面
- **GET `/admin`**：返回管理后台单页应用（HTML+CSS+JS）。

### 2. 获取用户列表（管理员）
- **GET `/api/admin/vip/list`**
- **Header**：`X-Internal-Secret: <INTERNAL_SECRET>`
- **返回**：
  ```json
  {
    "ok": true,
    "total": 1,
    "list": [
      {
        "username": "user123",
        "is_vip": true,
        "expire_at": 1735100000000,
        "order_id": "MANUAL_手动赠送",
        "trade_no": "MANUAL_OPERATION",
        "updated_at": "2026-11-23T01:20:00.000Z"
      }
    ]
  }
  ```

### 3. 手动设置 / 修改用户 VIP（管理员）
- **POST `/api/admin/vip/set`**
- **Header**：`X-Internal-Secret: <INTERNAL_SECRET>`
- **Body**：
  ```json
  {
    "username": "user123",
    "is_vip": true,
    "days": 30,
    "remark": "客服手动补偿"
  }
  ```
  > `days`: 有效天数。若设为 `0` 或留空，则代表**永久 VIP**。若用户当前已是有效 VIP，设置天数将在现有过期时间上**自动顺延**。
  > `is_vip`: 为 `false` 时直接取消用户的 VIP 资格。

### 4. 查询用户 VIP 状态（业务公开）
- **GET `/api/vip/check?username={用户名}`**

### 5. 支付同步接口（供支付系统调用）
- **POST `/api/vip/sync`**
- **Header**：`X-Internal-Secret: <INTERNAL_SECRET>`

### 6. 获取支付配置（管理员）
- **GET `/api/admin/pay/config`**
- **Header**：`X-Internal-Secret: <INTERNAL_SECRET>`
- **返回**：完整的支付配置 JSON，包括支付开关、网关地址、套餐列表等全部字段。
  ```json
  {
    "ok": true,
    "data": {
      "enabled": true,
      "pay_type": "alipay",
      "cfpay_gateway_url": "https://cfpay.xxx.workers.dev/api/pay/create",
      "alipay_gateway": "https://openapi.alipay.com/gateway.do",
      "alipay_app_id": "2021007121650658",
      "return_url": "https://your-domain.com/#/profile",
      "notify_url": "",
      "internal_secret": "",
      "plans": [
        { "id": "month", "name": "月度 VIP", "days": 30, "price": "19.90", "desc": "...", "badge": "尝鲜" }
      ],
      "updated_at": "2026-11-24T03:00:00.000Z"
    }
  }
  ```

### 7. 更新支付配置（管理员）
- **POST `/api/admin/pay/config`**
- **Header**：`X-Internal-Secret: <INTERNAL_SECRET>`
- **Body**：支持部分更新，只传需要修改的字段即可。
  ```json
  {
    "enabled": true,
    "pay_type": "alipay",
    "cfpay_gateway_url": "https://cfpay.xxx.workers.dev/api/pay/create",
    "plans": [
      { "id": "month", "name": "月度 VIP", "days": 30, "price": "19.90", "desc": "畅享 30 天" }
    ]
  }
  ```

### 8. 公开获取前端支付配置
- **GET `/api/pay/config`**
- 无需鉴权，仅返回前端需要的字段（启用状态、支付方式、套餐列表、跳转地址、网关地址），不暴露密钥等敏感信息。

### 9. 用户 VIP 详细信息
- **GET `/api/vip/info?username={用户名}`**
