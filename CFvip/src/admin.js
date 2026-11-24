export function renderAdminHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CFvip 会员管理后台</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #6366f1;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --success: #10b981;
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --radius: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at 15% 15%, #1e1e38 0%, #0f172a 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(135deg, #a5b4fc, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-badge {
      font-size: 0.75rem;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      -webkit-text-fill-color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .auth-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .auth-input {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      width: 220px;
      transition: all 0.2s;
    }

    .auth-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      flex: 1;
      width: 100%;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 840px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
      .auth-bar {
        width: 100%;
      }
      .auth-input {
        flex: 1;
      }
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #e2e8f0;
    }

    .card-title svg {
      width: 20px;
      height: 20px;
      color: var(--primary);
    }

    .form-group {
      margin-bottom: 1.1rem;
    }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
    }

    input, select, textarea {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .btn-primary {
      background: var(--primary);
      color: #fff;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-danger:hover {
      background: var(--danger);
      color: #fff;
    }

    .btn-sm {
      padding: 0.35rem 0.65rem;
      font-size: 0.775rem;
      border-radius: 6px;
    }

    .days-presets {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.4rem;
      flex-wrap: wrap;
    }

    .preset-pill {
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 9999px;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.15s;
    }

    .preset-pill:hover, .preset-pill.active {
      background: rgba(99, 102, 241, 0.2);
      color: #c7d2fe;
      border-color: rgba(99, 102, 241, 0.4);
    }

    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      overflow-x: auto;
    }

    .table-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    th {
      padding: 0.85rem 1rem;
      color: var(--text-muted);
      font-weight: 500;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.3);
    }

    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-vip {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-expired {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .badge-forever {
      background: rgba(192, 132, 252, 0.15);
      color: #c084fc;
      border: 1px solid rgba(192, 132, 252, 0.3);
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      gap: 0.5rem;
      z-index: 100;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .toast-success {
      background: #064e3b;
      color: #a7f3d0;
      border: 1px solid #059669;
    }

    .toast-error {
      background: #7f1d1d;
      color: #fecaca;
      border: 1px solid #dc2626;
    }

    .search-result-box {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border);
      display: none;
    }

    .search-result-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
    }

    .search-result-row:last-child {
      margin-bottom: 0;
    }

    .val-title {
      color: var(--text-muted);
    }

    /* 支付配置面板样式 */
    .pay-section {
      margin-bottom: 2rem;
    }

    .pay-section .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #e2e8f0;
    }

    .pay-section .section-title svg {
      width: 20px;
      height: 20px;
      color: var(--primary);
    }

    .pay-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .toggle-switch {
      position: relative;
      width: 48px;
      height: 26px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 13px;
      cursor: pointer;
      transition: background 0.2s;
      border: 1px solid var(--border);
    }

    .toggle-switch.active {
      background: var(--primary);
      border-color: var(--primary);
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      top: 2px;
      left: 2px;
      transition: transform 0.2s;
    }

    .toggle-switch.active::after {
      transform: translateX(22px);
    }

    .pay-type-selector {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .pay-type-option {
      flex: 1;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.5);
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .pay-type-option:hover {
      border-color: rgba(99, 102, 241, 0.4);
    }

    .pay-type-option.selected {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.1);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .pay-type-option .type-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.25rem;
    }

    .pay-type-option .type-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .plan-cards {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .plan-card {
      display: grid;
      grid-template-columns: 1fr 1fr 80px 1fr 1fr auto;
      gap: 0.75rem;
      align-items: center;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.4);
    }

    @media (max-width: 840px) {
      .plan-card {
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
    }

    .plan-card input {
      font-size: 0.85rem;
      padding: 0.5rem 0.65rem;
    }

    .plan-remove-btn {
      background: none;
      border: none;
      color: #f87171;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.35rem;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .plan-remove-btn:hover {
      background: rgba(239, 68, 68, 0.15);
    }

    .pay-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    .divider {
      height: 1px;
      background: var(--border);
      margin: 1.5rem 0;
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .config-status {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      padding: 0.3rem 0.7rem;
      border-radius: 9999px;
      margin-left: auto;
    }

    .config-status.saved {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .config-status.unsaved {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <span>👑 CFvip 管理后台</span>
      <span class="brand-badge">Cloudflare KV</span>
    </div>
    <div class="auth-bar">
      <input type="password" id="secretKey" class="auth-input" placeholder="输入管理密钥 (INTERNAL_SECRET)" />
      <button class="btn btn-secondary btn-sm" onclick="saveSecret()">保存密钥</button>
    </div>
  </header>

  <main class="container">
    <div class="grid">
      <!-- 手动设置 VIP 卡片 -->
      <div class="card">
        <div class="card-title">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          手动设置 / 续期 VIP
        </div>
        <form id="setVipForm" onsubmit="handleSetVip(event)">
          <div class="form-group">
            <label for="targetUser">目标用户名</label>
            <input type="text" id="targetUser" required placeholder="如：user_test" autocomplete="off" />
          </div>

          <div class="form-group">
            <label>VIP 状态</label>
            <select id="vipStatus" onchange="toggleDurationGroup()">
              <option value="true">开启 VIP</option>
              <option value="false">关闭 / 取消 VIP</option>
            </select>
          </div>

          <div id="durationGroup">
            <div class="form-group">
              <label for="durationDays">有效时长 (天数，0 表示永久)</label>
              <input type="number" id="durationDays" min="0" value="30" placeholder="0 表示永久有效" />
              <div class="days-presets">
                <span class="preset-pill" onclick="setPresetDays(7)">7 天</span>
                <span class="preset-pill active" onclick="setPresetDays(30)">30 天 (月卡)</span>
                <span class="preset-pill" onclick="setPresetDays(90)">90 天 (季卡)</span>
                <span class="preset-pill" onclick="setPresetDays(365)">365 天 (年卡)</span>
                <span class="preset-pill" onclick="setPresetDays(0)">永久 VIP</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="adminRemark">备注信息 (可选)</label>
            <input type="text" id="adminRemark" placeholder="如：手动赠送 / 客服处理 / 线下转账" />
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">
            确认提交并保存
          </button>
        </form>
      </div>

      <!-- 查询会员状态卡片 -->
      <div class="card">
        <div class="card-title">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          快捷查询用户状态
        </div>
        <div class="form-group">
          <label for="queryUser">输入查询用户名</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="queryUser" placeholder="输入要查询的用户名" autocomplete="off" />
            <button type="button" class="btn btn-secondary" onclick="handleQueryUser()">查询</button>
          </div>
        </div>

        <div id="searchResult" class="search-result-box">
          <div class="search-result-row">
            <span class="val-title">用户名:</span>
            <span id="resUser" style="font-weight: 600;">-</span>
          </div>
          <div class="search-result-row">
            <span class="val-title">VIP 状态:</span>
            <span id="resStatus">-</span>
          </div>
          <div class="search-result-row">
            <span class="val-title">到期时间:</span>
            <span id="resExpire">-</span>
          </div>
          <div class="search-result-row">
            <span class="val-title">关联订单:</span>
            <span id="resOrder" style="font-family: monospace;">-</span>
          </div>
          <div class="search-result-row">
            <span class="val-title">更新时间:</span>
            <span id="resUpdated">-</span>
          </div>
          <div class="search-result-row" style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed var(--border);">
            <button class="btn btn-danger btn-sm" onclick="cancelVipForQueriedUser()">取消该用户VIP</button>
            <button class="btn btn-secondary btn-sm" onclick="quickFillForm()">填入左侧表单编辑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 支付参数配置面板 -->
    <div class="card pay-section" style="margin-bottom: 2rem;">
      <div class="section-title">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        支付参数配置
        <span id="payConfigStatus" class="config-status saved" style="display: none;">● 已保存</span>
      </div>

      <!-- 支付开关 -->
      <div class="pay-toggle">
        <div id="payEnabledToggle" class="toggle-switch active" onclick="togglePayEnabled()"></div>
        <span style="font-size: 0.9rem;">启用在线支付</span>
        <span id="payEnabledLabel" style="font-size: 0.8rem; color: var(--success);">已启用</span>
      </div>

      <!-- 支付方式选择 -->
      <div class="form-group">
        <label>支付方式</label>
        <div class="pay-type-selector">
          <div class="pay-type-option selected" data-type="alipay" onclick="selectPayType('alipay')">
            <div class="type-label">💰 支付宝</div>
            <div class="type-desc">通过 CFpay 网关对接支付宝</div>
          </div>
          <div class="pay-type-option" data-type="custom" onclick="selectPayType('custom')">
            <div class="type-label">🔧 自定义</div>
            <div class="type-desc">自定义支付网关地址</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 网关配置 -->
      <div class="grid" style="margin-bottom: 0;">
        <div>
          <div class="form-group">
            <label for="payCfpayGateway">CFpay 网关地址</label>
            <input type="text" id="payCfpayGateway" placeholder="https://cfpay.xxx.workers.dev/api/pay/create" />
            <div class="field-hint">CFpay 创建支付订单的完整 URL</div>
          </div>
          <div class="form-group">
            <label for="payAlipayGateway">支付宝网关地址</label>
            <input type="text" id="payAlipayGateway" placeholder="https://openapi.alipay.com/gateway.do" />
            <div class="field-hint">支付宝开放平台网关，通常无需修改</div>
          </div>
          <div class="form-group">
            <label for="payAlipayAppId">支付宝应用 App ID</label>
            <input type="text" id="payAlipayAppId" placeholder="如：2021007121650658" />
            <div class="field-hint">在支付宝开放平台创建应用后获取</div>
          </div>
        </div>
        <div>
          <div class="form-group">
            <label for="payReturnUrl">支付完成跳转地址 (return_url)</label>
            <input type="text" id="payReturnUrl" placeholder="https://your-domain.com/#/profile" />
            <div class="field-hint">用户支付成功后浏览器自动跳转的前端页面地址</div>
          </div>
          <div class="form-group">
            <label for="payNotifyUrl">异步通知地址 (notify_url)</label>
            <input type="text" id="payNotifyUrl" placeholder="https://cfvip.xxx.workers.dev/api/vip/sync" />
            <div class="field-hint">支付结果异步通知回调 URL，通常指向本服务的 /api/vip/sync</div>
          </div>
          <div class="form-group">
            <label for="payInternalSecret">内部通信密钥 (internal_secret)</label>
            <input type="password" id="payInternalSecret" placeholder="用于 CFpay 与本服务之间的鉴权" />
            <div class="field-hint">CFpay 与 CFvip 之间通信使用的共享密钥</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- VIP 套餐管理 -->
      <div class="form-group">
        <label style="font-size: 0.95rem; font-weight: 600; color: #e2e8f0; margin-bottom: 0.75rem;">VIP 套餐列表</label>
        <div id="planCards" class="plan-cards">
          <!-- 套餐卡片将由 JS 动态渲染 -->
        </div>
        <button type="button" class="btn btn-secondary" style="margin-top: 0.75rem; width: 100%;" onclick="addPlan()">
          + 添加新套餐
        </button>
      </div>

      <div class="divider"></div>

      <!-- 操作按钮 -->
      <div class="pay-actions">
        <button class="btn btn-primary" onclick="savePayConfig()" style="flex: 1;">
          💾 保存支付配置
        </button>
        <button class="btn btn-secondary" onclick="loadPayConfig()">
          🔄 重新加载
        </button>
        <button class="btn btn-danger" onclick="resetPayConfig()">
          ⚠️ 恢复默认
        </button>
      </div>
    </div>

    <!-- 用户列表卡片 -->
    <div class="table-container">
      <div class="table-header-row">
        <div class="card-title" style="margin-bottom: 0;">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          VIP 用户列表
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="loadUsersList()">
            🔄 刷新列表
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>用户名</th>
            <th>VIP 状态</th>
            <th>到期时间</th>
            <th>订单号 / 备注</th>
            <th>最后更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="userTableBody">
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
              加载中...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>

  <div id="toast" class="toast"></div>

  <script>
    const STORAGE_KEY = 'cfvip_admin_secret';
    let currentQueriedData = null;

    // 初始化载入本地存储的 Secret
    window.addEventListener('DOMContentLoaded', () => {
      const savedSecret = localStorage.getItem(STORAGE_KEY) || '';
      document.getElementById('secretKey').value = savedSecret;
      loadUsersList();
    });

    function saveSecret() {
      const secret = document.getElementById('secretKey').value.trim();
      localStorage.setItem(STORAGE_KEY, secret);
      showToast('管理密钥已保存到本地', 'success');
      loadUsersList();
    }

    function getSecret() {
      return document.getElementById('secretKey').value.trim() || localStorage.getItem(STORAGE_KEY) || '';
    }

    function showToast(msg, type = 'success') {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.className = 'toast toast-' + type;
      toast.style.display = 'flex';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    }

    function toggleDurationGroup() {
      const isVip = document.getElementById('vipStatus').value === 'true';
      document.getElementById('durationGroup').style.display = isVip ? 'block' : 'none';
    }

    function setPresetDays(days) {
      document.getElementById('durationDays').value = days;
      document.querySelectorAll('.preset-pill').forEach(el => el.classList.remove('active'));
      event.target.classList.add('active');
    }

    // 格式化时间戳
    function formatDate(ts) {
      if (!ts) return '永久有效';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '-';
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
    }

    // 手动提交 VIP 设置
    async function handleSetVip(e) {
      e.preventDefault();
      const secret = getSecret();
      const username = document.getElementById('targetUser').value.trim();
      const is_vip = document.getElementById('vipStatus').value === 'true';
      const days = parseInt(document.getElementById('durationDays').value) || 0;
      const remark = document.getElementById('adminRemark').value.trim();

      if (!username) {
        showToast('请输入用户名', 'error');
        return;
      }

      try {
        const res = await fetch('/api/admin/vip/set', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': secret
          },
          body: JSON.stringify({
            username,
            is_vip,
            days,
            remark
          })
        });

        const data = await res.json();
        if (data.ok) {
          showToast(data.message || '设置成功', 'success');
          loadUsersList();
          if (document.getElementById('queryUser').value.trim() === username) {
            handleQueryUser();
          }
        } else {
          showToast(data.message || '操作失败', 'error');
        }
      } catch (err) {
        showToast('网络请求错误: ' + err.message, 'error');
      }
    }

    // 快捷查询用户
    async function handleQueryUser() {
      const username = document.getElementById('queryUser').value.trim();
      const resultBox = document.getElementById('searchResult');
      if (!username) {
        showToast('请输入用户名进行查询', 'error');
        return;
      }

      try {
        const res = await fetch('/api/vip/check?username=' + encodeURIComponent(username));
        const data = await res.json();

        if (data.ok) {
          resultBox.style.display = 'block';
          currentQueriedData = data;
          document.getElementById('resUser').innerText = data.username;
          
          const isVip = data.is_vip;
          const expireAt = data.expire_at;
          const now = Date.now();

          let statusHtml = '';
          if (isVip) {
            if (!expireAt) {
              statusHtml = '<span class="badge badge-forever">永久 VIP</span>';
            } else {
              statusHtml = '<span class="badge badge-vip">VIP 激活中</span>';
            }
          } else {
            statusHtml = '<span class="badge badge-expired">' + (data.message || '非 VIP') + '</span>';
          }

          document.getElementById('resStatus').innerHTML = statusHtml;
          document.getElementById('resExpire').innerText = expireAt ? formatDate(expireAt) : (isVip ? '永久有效' : '-');
          document.getElementById('resOrder').innerText = data.order_id || '无';
          document.getElementById('resUpdated').innerText = data.updated_at ? formatDate(data.updated_at) : '-';
        } else {
          showToast(data.message || '查询失败', 'error');
        }
      } catch (err) {
        showToast('请求失败: ' + err.message, 'error');
      }
    }

    // 把当前查询到的用户填入左侧表单编辑
    function quickFillForm() {
      if (!currentQueriedData) return;
      document.getElementById('targetUser').value = currentQueriedData.username;
      document.getElementById('vipStatus').value = currentQueriedData.is_vip ? 'true' : 'false';
      toggleDurationGroup();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 取消查询到的用户 VIP
    async function cancelVipForQueriedUser() {
      if (!currentQueriedData) return;
      if (!confirm('确定要取消用户 [' + currentQueriedData.username + '] 的 VIP 资格吗？')) return;

      const secret = getSecret();
      try {
        const res = await fetch('/api/admin/vip/set', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': secret
          },
          body: JSON.stringify({
            username: currentQueriedData.username,
            is_vip: false,
            remark: '管理员手动取消'
          })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('已取消该用户 VIP', 'success');
          handleQueryUser();
          loadUsersList();
        } else {
          showToast(data.message || '操作失败', 'error');
        }
      } catch (err) {
        showToast('请求错误: ' + err.message, 'error');
      }
    }

    // 快捷操作用户
    async function quickAction(username, isVip, days) {
      const secret = getSecret();
      try {
        const res = await fetch('/api/admin/vip/set', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': secret
          },
          body: JSON.stringify({
            username,
            is_vip: isVip,
            days: days,
            remark: isVip ? '列表快捷续费' : '列表快捷取消'
          })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('更新成功', 'success');
          loadUsersList();
        } else {
          showToast(data.message || '更新失败', 'error');
        }
      } catch (err) {
        showToast('网络错误: ' + err.message, 'error');
      }
    }

    // 载入 VIP 用户列表
    async function loadUsersList() {
      const tbody = document.getElementById('userTableBody');
      const secret = getSecret();

      try {
        const res = await fetch('/api/admin/vip/list', {
          headers: {
            'X-Internal-Secret': secret
          }
        });

        if (res.status === 401) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 2rem;">' +
            '⚠️ 密钥未配置或无效，请在页面右上角输入正确的 INTERNAL_SECRET 后刷新。</td></tr>';
          return;
        }

        const data = await res.json();
        if (!data.ok) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 2rem;">' + (data.message || '获取列表失败') + '</td></tr>';
          return;
        }

        const list = data.list || [];
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无任何 VIP 用户数据</td></tr>';
          return;
        }

        const now = Date.now();
        let html = '';
        for (const item of list) {
          const isVip = item.is_vip && (!item.expire_at || item.expire_at > now);
          let badge = '';
          if (isVip) {
            badge = item.expire_at ? '<span class="badge badge-vip">VIP</span>' : '<span class="badge badge-forever">永久 VIP</span>';
          } else {
            badge = '<span class="badge badge-expired">已到期/关闭</span>';
          }

          html += \`<tr>
            <td style="font-weight: 600; color: #f1f5f9;">\${escapeHtml(item.username)}</td>
            <td>\${badge}</td>
            <td>\${formatDate(item.expire_at)}</td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">\${escapeHtml(item.order_id || '-')}</td>
            <td>\${formatDate(item.updated_at)}</td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm" onclick="editUserFromList('\${escapeHtml(item.username)}')">编辑</button>
                \${isVip 
                  ? \`<button class="btn btn-danger btn-sm" onclick="quickAction('\${escapeHtml(item.username)}', false, 0)">取消</button>\`
                  : \`<button class="btn btn-primary btn-sm" onclick="quickAction('\${escapeHtml(item.username)}', true, 30)">开启30天</button>\`
                }
              </div>
            </td>
          </tr>\`;
        }
        tbody.innerHTML = html;
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #f87171; padding: 2rem;">加载异常: ' + err.message + '</td></tr>';
      }
    }

    function editUserFromList(username) {
      document.getElementById('targetUser').value = username;
      document.getElementById('vipStatus').value = 'true';
      toggleDurationGroup();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // ======== 支付配置管理 ========
    let payConfig = null; // 当前加载的支付配置缓存

    // 页面初始化时也加载支付配置
    const origDOMReady = window.addEventListener;
    window.addEventListener('DOMContentLoaded', () => {
      loadPayConfig();
    });

    // 加载支付配置
    async function loadPayConfig() {
      const secret = getSecret();
      try {
        const res = await fetch('/api/admin/pay/config', {
          headers: { 'X-Internal-Secret': secret }
        });
        const data = await res.json();
        if (data.ok) {
          payConfig = data.data;
          renderPayConfig(payConfig);
          updatePayConfigStatus('saved');
          showToast('支付配置加载成功', 'success');
        } else {
          showToast(data.message || '加载支付配置失败', 'error');
        }
      } catch (err) {
        showToast('加载支付配置异常: ' + err.message, 'error');
      }
    }

    // 渲染支付配置到表单
    function renderPayConfig(config) {
      // 支付开关
      const toggle = document.getElementById('payEnabledToggle');
      const label = document.getElementById('payEnabledLabel');
      if (config.enabled) {
        toggle.classList.add('active');
        label.textContent = '已启用';
        label.style.color = 'var(--success)';
      } else {
        toggle.classList.remove('active');
        label.textContent = '已禁用';
        label.style.color = 'var(--text-muted)';
      }

      // 支付方式
      selectPayType(config.pay_type || 'alipay', true);

      // 网关字段
      document.getElementById('payCfpayGateway').value = config.cfpay_gateway_url || '';
      document.getElementById('payAlipayGateway').value = config.alipay_gateway || '';
      document.getElementById('payAlipayAppId').value = config.alipay_app_id || '';
      document.getElementById('payReturnUrl').value = config.return_url || '';
      document.getElementById('payNotifyUrl').value = config.notify_url || '';
      document.getElementById('payInternalSecret').value = config.internal_secret || '';

      // 套餐列表
      renderPlans(config.plans || []);
    }

    // 切换支付开关
    function togglePayEnabled() {
      const toggle = document.getElementById('payEnabledToggle');
      const label = document.getElementById('payEnabledLabel');
      const isActive = toggle.classList.toggle('active');
      if (isActive) {
        label.textContent = '已启用';
        label.style.color = 'var(--success)';
      } else {
        label.textContent = '已禁用';
        label.style.color = 'var(--text-muted)';
      }
      updatePayConfigStatus('unsaved');
    }

    // 选择支付方式
    function selectPayType(type, silent) {
      document.querySelectorAll('.pay-type-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.type === type);
      });
      if (!silent) updatePayConfigStatus('unsaved');
    }

    // 渲染套餐卡片列表
    function renderPlans(plans) {
      const container = document.getElementById('planCards');
      if (!plans || plans.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">暂未配置任何 VIP 套餐，点击下方按钮添加</div>';
        return;
      }
      let html = '';
      plans.forEach((plan, index) => {
        html += \`<div class="plan-card" data-index="\${index}">
          <input type="text" value="\${escapeHtml(plan.id || '')}" placeholder="套餐 ID" title="套餐唯一标识" onchange="updatePayConfigStatus('unsaved')" />
          <input type="text" value="\${escapeHtml(plan.name || '')}" placeholder="套餐名称" title="套餐显示名称" onchange="updatePayConfigStatus('unsaved')" />
          <input type="number" value="\${plan.days || 0}" placeholder="天数" min="0" title="有效天数" onchange="updatePayConfigStatus('unsaved')" />
          <input type="text" value="\${escapeHtml(plan.price || '')}" placeholder="价格" title="价格 (元)" onchange="updatePayConfigStatus('unsaved')" />
          <input type="text" value="\${escapeHtml(plan.desc || '')}" placeholder="套餐描述" title="套餐描述" onchange="updatePayConfigStatus('unsaved')" />
          <button type="button" class="plan-remove-btn" onclick="removePlan(\${index})" title="删除此套餐">✕</button>
        </div>\`;
      });
      container.innerHTML = html;
    }

    // 添加新套餐
    function addPlan() {
      const container = document.getElementById('planCards');
      // 如果当前是空提示文字，先清空
      if (container.querySelector('.plan-card') === null) {
        container.innerHTML = '';
      }
      const index = container.querySelectorAll('.plan-card').length;
      const html = \`<div class="plan-card" data-index="\${index}">
        <input type="text" value="" placeholder="套餐 ID (如 month)" title="套餐唯一标识" />
        <input type="text" value="" placeholder="套餐名称 (如 月度VIP)" title="套餐显示名称" />
        <input type="number" value="30" placeholder="天数" min="0" title="有效天数" />
        <input type="text" value="" placeholder="价格 (如 19.90)" title="价格 (元)" />
        <input type="text" value="" placeholder="套餐描述" title="套餐描述" />
        <button type="button" class="plan-remove-btn" onclick="removePlan(\${index})" title="删除此套餐">✕</button>
      </div>\`;
      container.insertAdjacentHTML('beforeend', html);
      updatePayConfigStatus('unsaved');
    }

    // 删除指定套餐
    function removePlan(index) {
      const plans = collectPlansFromForm();
      plans.splice(index, 1);
      renderPlans(plans);
      updatePayConfigStatus('unsaved');
    }

    // 从表单收集套餐数据
    function collectPlansFromForm() {
      const cards = document.querySelectorAll('#planCards .plan-card');
      const plans = [];
      cards.forEach(card => {
        const inputs = card.querySelectorAll('input');
        plans.push({
          id: inputs[0].value.trim(),
          name: inputs[1].value.trim(),
          days: parseInt(inputs[2].value) || 0,
          price: inputs[3].value.trim(),
          desc: inputs[4].value.trim(),
        });
      });
      return plans;
    }

    // 从表单收集完整支付配置
    function collectPayConfigFromForm() {
      const enabled = document.getElementById('payEnabledToggle').classList.contains('active');
      const payTypeEl = document.querySelector('.pay-type-option.selected');
      const pay_type = payTypeEl ? payTypeEl.dataset.type : 'alipay';

      return {
        enabled,
        pay_type,
        cfpay_gateway_url: document.getElementById('payCfpayGateway').value.trim(),
        alipay_gateway: document.getElementById('payAlipayGateway').value.trim(),
        alipay_app_id: document.getElementById('payAlipayAppId').value.trim(),
        return_url: document.getElementById('payReturnUrl').value.trim(),
        notify_url: document.getElementById('payNotifyUrl').value.trim(),
        internal_secret: document.getElementById('payInternalSecret').value.trim(),
        plans: collectPlansFromForm(),
      };
    }

    // 保存支付配置
    async function savePayConfig() {
      const secret = getSecret();
      const config = collectPayConfigFromForm();

      // 客户端基本校验
      for (const plan of config.plans) {
        if (!plan.id || !plan.name || !plan.price) {
          showToast('套餐数据不完整：请确保每个套餐都填写了 ID、名称和价格', 'error');
          return;
        }
      }

      try {
        const res = await fetch('/api/admin/pay/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': secret,
          },
          body: JSON.stringify(config),
        });
        const data = await res.json();
        if (data.ok) {
          payConfig = data.data;
          updatePayConfigStatus('saved');
          showToast('支付配置保存成功', 'success');
        } else {
          showToast(data.message || '保存失败', 'error');
        }
      } catch (err) {
        showToast('保存支付配置异常: ' + err.message, 'error');
      }
    }

    // 恢复默认配置
    async function resetPayConfig() {
      if (!confirm('确定要恢复为默认支付配置吗？当前配置将被覆盖。')) return;

      const secret = getSecret();
      const defaultConfig = {
        enabled: true,
        pay_type: 'alipay',
        cfpay_gateway_url: 'https://cfpay.accessible-grenadilla.workers.dev/api/pay/create',
        alipay_gateway: 'https://openapi.alipay.com/gateway.do',
        alipay_app_id: '2021007121650658',
        return_url: 'https://your-domain.com/#/profile',
        notify_url: '',
        internal_secret: '',
        plans: [
          { id: 'month', name: '月度 VIP', days: 30, price: '19.90', desc: '畅享 30 天无限制高清播放', badge: '尝鲜' },
          { id: 'quarter', name: '季度 VIP', days: 90, price: '49.90', desc: '畅享 90 天无限制高清播放', badge: '特惠' },
          { id: 'year', name: '年度 VIP', days: 365, price: '99.00', desc: '畅享 365 天无限制高清播放', badge: '超值' },
        ],
      };

      try {
        const res = await fetch('/api/admin/pay/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': secret,
          },
          body: JSON.stringify(defaultConfig),
        });
        const data = await res.json();
        if (data.ok) {
          payConfig = data.data;
          renderPayConfig(payConfig);
          updatePayConfigStatus('saved');
          showToast('已恢复默认支付配置', 'success');
        } else {
          showToast(data.message || '恢复失败', 'error');
        }
      } catch (err) {
        showToast('恢复默认配置异常: ' + err.message, 'error');
      }
    }

    // 更新配置保存状态标记
    function updatePayConfigStatus(status) {
      const el = document.getElementById('payConfigStatus');
      el.style.display = 'inline-flex';
      if (status === 'saved') {
        el.className = 'config-status saved';
        el.textContent = '● 已保存';
      } else {
        el.className = 'config-status unsaved';
        el.textContent = '● 未保存';
      }
    }
  </script>
</body>
</html>`;
}
