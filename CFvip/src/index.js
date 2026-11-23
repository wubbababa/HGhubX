/**
 * CFvip: Cloudflare Worker VIP 判断与同步服务 & 管理后台
 * 
 * 路由说明：
 * 1. GET  /admin                          - 管理后台可视化前端页面
 * 2. GET  /api/admin/vip/list             - 管理员获取所有 VIP 用户列表
 * 3. POST /api/admin/vip/set              - 管理员手动为用户设置/续费/取消 VIP
 * 4. GET  /api/vip/check?username=xxx     - 查询某用户是否为 VIP 会员 (公开)
 * 5. POST /api/vip/sync                   - 接收支付平台(CFpay)回调同步 VIP 状态
 * 6. GET  /api/vip/info?username=xxx      - 获取用户 VIP 详细信息及支付关联记录
 */

import { renderAdminHtml } from "./admin.js";

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

    // 5. 用户 VIP 详细信息
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
