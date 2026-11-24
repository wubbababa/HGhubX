/**
 * CFvip: Cloudflare Worker VIP 判断与同步服务 & 管理后台
 * 
 * 路由说明：
 * 1.  GET  /admin                          - 管理后台可视化前端页面
 * 2.  GET  /api/admin/vip/list             - 管理员获取所有 VIP 用户列表
 * 3.  POST /api/admin/vip/set              - 管理员手动为用户设置/续费/取消 VIP
 * 4.  GET  /api/vip/check?username=xxx     - 查询某用户是否为 VIP 会员 (公开)
 * 5.  POST /api/vip/sync                   - 接收支付平台(CFpay)回调同步 VIP 状态
 * 6.  GET  /api/admin/pay/config           - 管理员获取支付相关配置
 * 7.  POST /api/admin/pay/config           - 管理员更新支付相关配置
 * 8.  GET  /api/pay/config                 - 公开获取前端支付配置 (套餐、网关、启用状态)
 * 9.  GET  /api/vip/info?username=xxx      - 获取用户 VIP 详细信息及支付关联记录
 */

import { renderAdminHtml } from "./admin.js";

// 默认支付配置
const DEFAULT_PAY_CONFIG = {
  enabled: true,
  pay_type: "alipay", // alipay | custom
  cfpay_gateway_url: "https://cfpay.accessible-grenadilla.workers.dev/api/pay/create",
  alipay_gateway: "https://openapi.alipay.com/gateway.do",
  alipay_app_id: "2021007121650658",
  return_url: "https://your-domain.com/#/profile",
  notify_url: "",
  internal_secret: "",
  plans: [
    { id: "month", name: "月度 VIP", days: 30, price: "19.90", desc: "畅享 30 天无限制高清播放", badge: "尝鲜" },
    { id: "quarter", name: "季度 VIP", days: 90, price: "49.90", desc: "畅享 90 天无限制高清播放", badge: "特惠" },
    { id: "year", name: "年度 VIP", days: 365, price: "99.00", desc: "畅享 365 天无限制高清播放", badge: "超值" },
  ],
  updated_at: null,
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Secret",
    },
  });
}

function checkAdminAuth(request, env) {
  const secretHeader = request.headers.get("X-Internal-Secret");
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = env.INTERNAL_SECRET;

  if (!expectedSecret) return true; // 如果未设置密钥则开放

  const isAuthorized =
    (secretHeader && secretHeader === expectedSecret) ||
    (authHeader && authHeader.replace(/^Bearer\s+/i, "") === expectedSecret);

  return isAuthorized;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 200);
    }

    // 0. 管理后台页面 GET /admin
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return new Response(renderAdminHtml(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // 1. 管理后台 API: 获取所有用户列表 GET /api/admin/vip/list
    if (url.pathname === "/api/admin/vip/list" && request.method === "GET") {
      if (!checkAdminAuth(request, env)) {
        return jsonResponse({ ok: false, message: "未授权：请提供有效的管理密钥" }, 401);
      }

      try {
        const listResult = await env.VIP_KV.list({ prefix: "vip:" });
        const list = [];
        
        // 批量并发查询详情 (单次最多取前 100 条)
        const keys = (listResult && listResult.keys) ? listResult.keys.slice(0, 100) : [];
        await Promise.all(
          keys.map(async (k) => {
            const raw = await env.VIP_KV.get(k.name);
            if (raw) {
              try {
                list.push(JSON.parse(raw));
              } catch (_) {}
            }
          })
        );

        // 按更新时间倒序排序
        list.sort((a, b) => {
          const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return tB - tA;
        });

        return jsonResponse({
          ok: true,
          total: list.length,
          list,
        });
      } catch (err) {
        return jsonResponse({ ok: false, message: "读取列表异常: " + err.message }, 500);
      }
    }

    // 2. 管理后台 API: 手动设置/修改 VIP POST /api/admin/vip/set
    if (url.pathname === "/api/admin/vip/set" && request.method === "POST") {
      if (!checkAdminAuth(request, env)) {
        return jsonResponse({ ok: false, message: "未授权：请提供有效的管理密钥" }, 401);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ ok: false, message: "无效的 JSON 数据" }, 400);
      }

      const { username, is_vip, days, remark } = payload;
      if (!username || typeof is_vip !== "boolean") {
        return jsonResponse(
          { ok: false, message: "缺少必要参数: username, is_vip" },
          400
        );
      }

      const now = Date.now();
      let expireAt = null;

      if (is_vip) {
        const numDays = Number(days);
        if (numDays > 0) {
          // 如果当前已经是 VIP 且未过期，支持在当前到期时间上顺延，否则从现在开始计算
          const existingRaw = await env.VIP_KV.get(`vip:${username.trim()}`);
          let baseTime = now;
          if (existingRaw) {
            try {
              const existing = JSON.parse(existingRaw);
              if (existing.is_vip && existing.expire_at && existing.expire_at > now) {
                baseTime = existing.expire_at;
              }
            } catch (_) {}
          }
          expireAt = baseTime + numDays * 24 * 60 * 60 * 1000;
        } else {
          // 传入 0 或未传则代表永久有效
          expireAt = null;
        }
      }

      const vipRecord = {
        username: username.trim(),
        is_vip,
        order_id: remark ? `MANUAL_${remark}` : `MANUAL_${now}`,
        trade_no: "MANUAL_OPERATION",
        expire_at: expireAt,
        updated_at: new Date().toISOString(),
      };

      await env.VIP_KV.put(`vip:${username.trim()}`, JSON.stringify(vipRecord));

      return jsonResponse({
        ok: true,
        message: is_vip ? `已成功设置用户 [${username}] 为 VIP` : `已成功取消用户 [${username}] 的 VIP`,
        data: vipRecord,
      });
    }

    // 3. 查询是否为 VIP
    if (url.pathname === "/api/vip/check" && request.method === "GET") {
      const username = url.searchParams.get("username")?.trim();
      if (!username) {
        return jsonResponse({ ok: false, message: "缺少 username 参数" }, 400);
      }

      // 从 KV 获取用户记录
      const raw = await env.VIP_KV.get(`vip:${username}`);
      if (!raw) {
        return jsonResponse({
          ok: true,
          username,
          is_vip: false,
          expire_at: null,
          message: "非VIP用户",
        });
      }

      try {
        const record = JSON.parse(raw);
        const now = Date.now();
        const isVip = record.is_vip && (!record.expire_at || record.expire_at > now);

        return jsonResponse({
          ok: true,
          username,
          is_vip: !!isVip,
          expire_at: record.expire_at || null,
          order_id: record.order_id || null,
          updated_at: record.updated_at || null,
        });
      } catch (err) {
        return jsonResponse({ ok: false, message: "解析用户信息失败" }, 500);
      }
    }

    // 4. 接收来自支付平台(CFpay)同步的 VIP 数据
    if (url.pathname === "/api/vip/sync" && request.method === "POST") {
      // 验证内部通信鉴权密钥
      if (!checkAdminAuth(request, env)) {
        return jsonResponse({ ok: false, message: "未授权的内部调用" }, 401);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ ok: false, message: "无效的 JSON 数据" }, 400);
      }

      // 提取核心字段：用户名 / 是否vip / 支付单号码
      const { username, is_vip, order_id, trade_no, days } = payload;

      if (!username || typeof is_vip !== "boolean" || !order_id) {
        return jsonResponse(
          {
            ok: false,
            message: "缺少必要参数: username, is_vip (boolean), order_id",
          },
          400
        );
      }

      // 计算过期时间（例如默认30天或按传入天数，为0则永久）
      const now = Date.now();
      let expireAt = null;
      if (is_vip) {
        const durationDays = Number(days) || 30; // 默认赠送/购买 30 天 VIP
        expireAt = now + durationDays * 24 * 60 * 60 * 1000;
      }

      const vipRecord = {
        username: username.trim(),
        is_vip,
        order_id,
        trade_no: trade_no || null,
        expire_at: expireAt,
        updated_at: new Date().toISOString(),
      };

      // 存入 KV 存储 (以 username 作为主键)
      await env.VIP_KV.put(`vip:${username.trim()}`, JSON.stringify(vipRecord));

      // 额外存一份订单索引以备对账
      await env.VIP_KV.put(`order:${order_id}`, JSON.stringify(vipRecord));

      return jsonResponse({
        ok: true,
        message: "VIP状态同步成功",
        data: vipRecord,
      });
    }

    // 5. 管理员获取支付相关配置 GET /api/admin/pay/config
    if (url.pathname === "/api/admin/pay/config" && request.method === "GET") {
      if (!checkAdminAuth(request, env)) {
        return jsonResponse({ ok: false, message: "未授权：请提供有效的管理密钥" }, 401);
      }

      try {
        const raw = await env.VIP_KV.get("config:pay");
        const config = raw ? JSON.parse(raw) : { ...DEFAULT_PAY_CONFIG };
        return jsonResponse({ ok: true, data: config });
      } catch (err) {
        return jsonResponse({ ok: false, message: "读取支付配置异常: " + err.message }, 500);
      }
    }

    // 6. 管理员更新支付相关配置 POST /api/admin/pay/config
    if (url.pathname === "/api/admin/pay/config" && request.method === "POST") {
      if (!checkAdminAuth(request, env)) {
        return jsonResponse({ ok: false, message: "未授权：请提供有效的管理密钥" }, 401);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ ok: false, message: "无效的 JSON 数据" }, 400);
      }

      try {
        // 读取现有配置，合并更新
        const raw = await env.VIP_KV.get("config:pay");
        const existing = raw ? JSON.parse(raw) : { ...DEFAULT_PAY_CONFIG };

        // 安全合并：只更新允许的顶级字段
        const allowedFields = [
          "enabled", "pay_type", "cfpay_gateway_url",
          "alipay_gateway", "alipay_app_id",
          "return_url", "notify_url", "internal_secret",
          "plans",
        ];

        for (const field of allowedFields) {
          if (payload[field] !== undefined) {
            existing[field] = payload[field];
          }
        }

        // 校验套餐数据格式
        if (existing.plans && Array.isArray(existing.plans)) {
          for (const plan of existing.plans) {
            if (!plan.id || !plan.name || plan.days === undefined || plan.price === undefined) {
              return jsonResponse({
                ok: false,
                message: "套餐数据格式错误：每个套餐需包含 id, name, days, price 字段",
              }, 400);
            }
          }
        }

        existing.updated_at = new Date().toISOString();

        await env.VIP_KV.put("config:pay", JSON.stringify(existing));

        return jsonResponse({
          ok: true,
          message: "支付配置已更新",
          data: existing,
        });
      } catch (err) {
        return jsonResponse({ ok: false, message: "更新支付配置异常: " + err.message }, 500);
      }
    }

    // 7. 公开获取前端支付配置（套餐、网关、启用状态） GET /api/pay/config
    if (url.pathname === "/api/pay/config" && request.method === "GET") {
      try {
        const raw = await env.VIP_KV.get("config:pay");
        const config = raw ? JSON.parse(raw) : { ...DEFAULT_PAY_CONFIG };

        // 公开接口只返回前端需要的字段，不暴露敏感信息
        return jsonResponse({
          ok: true,
          data: {
            enabled: config.enabled,
            pay_type: config.pay_type,
            plans: config.plans || [],
            return_url: config.return_url || "",
            cfpay_gateway_url: config.cfpay_gateway_url || "",
          },
        });
      } catch (err) {
        return jsonResponse({ ok: false, message: "读取支付配置异常: " + err.message }, 500);
      }
    }

    // 8. 用户 VIP 详细信息
    if (url.pathname === "/api/vip/info" && request.method === "GET") {
      const username = url.searchParams.get("username")?.trim();
      if (!username) {
        return jsonResponse({ ok: false, message: "缺少 username 参数" }, 400);
      }
      const raw = await env.VIP_KV.get(`vip:${username}`);
      if (!raw) {
        return jsonResponse({ ok: true, exists: false, is_vip: false });
      }
      return jsonResponse({ ok: true, exists: true, data: JSON.parse(raw) });
    }

    return jsonResponse({ ok: false, message: "未找到该接口" }, 404);
  },
};
