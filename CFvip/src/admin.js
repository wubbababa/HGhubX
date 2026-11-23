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
  </script>
</body>
</html>`;
}
