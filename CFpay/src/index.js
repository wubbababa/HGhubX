/**
 * CFpay: Cloudflare Workers 支付宝支付平台
 * 
 * 主要接口：
 * 1. POST /api/pay/create   - 创建支付订单，生成并返回支付宝电脑/手机网页支付跳转 URL
 * 2. POST /api/pay/notify   - 支付宝服务端异步回调通知，验签并通知 CFvip
 * 3. GET  /api/pay/query    - 查询订单当前支付状态
 */

import { getAlipayTimestamp, signParams, verifyAlipaySignature } from "./alipay.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 200);
    }

    // 0. 测试是否开通「当面付」(alipay.trade.precreate 扫码支付)
    if (url.pathname === "/api/pay/test-precreate" && (request.method === "GET" || request.method === "POST")) {
      try {
        const orderId = `TEST_F2F_${Date.now()}`;
        const bizContent = JSON.stringify({
          out_trade_no: orderId,
          total_amount: "0.01",
          subject: "当面付开通检测",
        });

        const commonParams = {
          app_id: env.ALIPAY_APP_ID,
          method: "alipay.trade.precreate",
          format: "JSON",
          charset: "utf-8",
          sign_type: "RSA2",
          timestamp: getAlipayTimestamp(),
          version: "1.0",
          biz_content: bizContent,
        };

        const sign = await signParams(commonParams, env.ALIPAY_PRIVATE_KEY);
        const queryParams = new URLSearchParams({ ...commonParams, sign });
        const gateway = env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do";

        const resp = await fetch(`${gateway}?${queryParams.toString()}`);
        const result = await resp.json();

        const precreateResp = result?.alipay_trade_precreate_response;
        const isSuccess = precreateResp?.code === "10000";

        return jsonResponse({
          ok: true,
          has_precreate: isSuccess,
          summary: isSuccess
            ? "恭喜！你的账号已成功开通「当面付」(扫码支付能力)"
            : `未开通当面付或调用受限: [${precreateResp?.sub_code || precreateResp?.code}] ${precreateResp?.sub_msg || precreateResp?.msg}`,
          alipay_response: precreateResp,
        });
      } catch (err) {
        return jsonResponse({ ok: false, message: `探测异常: ${err.message}` }, 500);
      }
    }

    // 1. 创建支付订单并生成支付宝支付页面链接
    if (url.pathname === "/api/pay/create" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, message: "无效的请求参数" }, 400);
      }

      const { username, days = 30, amount, subject = "HGhubX VIP会员" } = body;
      if (!username) {
        return jsonResponse({ ok: false, message: "缺少必要参数 username" }, 400);
      }

      // 金额计算（可根据天数预设计费，例如 30天 = 19.90 元，或外部传入）
      const totalAmount = amount || (days >= 365 ? "99.00" : "19.90");

      // 生成本系统唯一订单号 (OUT_TRADE_NO)
      const orderId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 异步回调地址 (指向本 Worker 的 /api/pay/notify)
      const notifyUrl = `${url.origin}/api/pay/notify`;

      // 组装支付宝 biz_content
      const bizContent = JSON.stringify({
        out_trade_no: orderId,
        total_amount: totalAmount,
        subject,
        product_code: "FAST_INSTANT_TRADE_PAY", // 电脑/H5即时到账
        // 传递附带参数 passback_params (包含用户名和开通天数)
        passback_params: encodeURIComponent(JSON.stringify({ username, days })),
      });

      // 基础公共参数
      const commonParams = {
        app_id: env.ALIPAY_APP_ID,
        method: "alipay.trade.page.pay",
        format: "JSON",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: getAlipayTimestamp(),
        version: "1.0",
        notify_url: notifyUrl,
        return_url: env.RETURN_URL || `${url.origin}/api/pay/return`,
        biz_content: bizContent,
      };

      // 私钥签名
      let sign;
      try {
        sign = await signParams(commonParams, env.ALIPAY_PRIVATE_KEY);
      } catch (err) {
        return jsonResponse({ ok: false, message: `签名生成失败: ${err.message}` }, 500);
      }

      // 拼接跳转链接
      const queryParams = new URLSearchParams({ ...commonParams, sign });
      const gateway = env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do";
      const paymentUrl = `${gateway}?${queryParams.toString()}`;

      // 暂存订单状态至 KV
      const orderRecord = {
        order_id: orderId,
        username,
        amount: totalAmount,
        days,
        status: "PENDING",
        created_at: new Date().toISOString(),
      };
      if (env.PAY_KV) {
        await env.PAY_KV.put(`order:${orderId}`, JSON.stringify(orderRecord), {
          expirationTtl: 86400 * 3, // 保留 3 天
        });
      }

      return jsonResponse({
        ok: true,
        order_id: orderId,
        payment_url: paymentUrl,
        amount: totalAmount,
        username,
      });
    }

    // 2. 接收支付宝异步通知并验签回调
    if (url.pathname === "/api/pay/notify" && request.method === "POST") {
      // 支付宝异步回调是 application/x-www-form-urlencoded
      let params = {};
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await request.text();
        const search = new URLSearchParams(text);
        for (const [key, val] of search.entries()) {
          params[key] = val;
        }
      } else {
        try {
          params = await request.json();
        } catch {
          return new Response("fail", { status: 400 });
        }
      }

      // 1. 验证签名
      let verified = false;
      try {
        verified = await verifyAlipaySignature(params, env.ALIPAY_PUBLIC_KEY);
      } catch (err) {
        return new Response("fail", { status: 500 });
      }

      if (!verified) {
        console.error("支付宝回调签名验证失败", params);
        return new Response("fail", { status: 400 });
      }

      const tradeStatus = params.trade_status;
      const orderId = params.out_trade_no;
      const tradeNo = params.trade_no;

      // 支付成功状态：TRADE_SUCCESS 或 TRADE_FINISHED
      if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
        // 解析附加参数获取用户名
        let username = null;
        let days = 30;
        try {
          if (params.passback_params) {
            const passback = JSON.parse(decodeURIComponent(params.passback_params));
            username = passback.username;
            days = passback.days || 30;
          }
        } catch { /* 忽略解析错误 */ }

        // 如果 passback 没取到，从本地订单 KV 读取
        if (!username && env.PAY_KV) {
          const stored = await env.PAY_KV.get(`order:${orderId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            username = parsed.username;
            days = parsed.days || 30;
          }
        }

        if (!username) {
          console.error("未找到对应用户名", orderId);
          return new Response("fail", { status: 400 });
        }

        // 更新本地订单状态
        if (env.PAY_KV) {
          const updatedRecord = {
            order_id: orderId,
            trade_no: tradeNo,
            username,
            status: "PAID",
            paid_at: new Date().toISOString(),
          };
          await env.PAY_KV.put(`order:${orderId}`, JSON.stringify(updatedRecord));
        }

        // ⭐ 重点需求：把用户名 / 是否vip / 支付单号码 提交到 CFvip 判断模块
        const cfVipUrl = `${(env.CFVIP_SERVICE_URL || "").replace(/\/$/, "")}/api/vip/sync`;
        try {
          const syncRes = await fetch(cfVipUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": env.INTERNAL_SECRET || "",
            },
            body: JSON.stringify({
              username,
              is_vip: true,
              order_id: orderId,
              trade_no: tradeNo,
              days,
            }),
          });

          if (!syncRes.ok) {
            const errText = await syncRes.text();
            console.error("同步至 CFvip 失败:", errText);
            // 稍后支付宝还会重试回调，或根据业务需求返回 fail
          }
        } catch (err) {
          console.error("请求 CFvip 发生异常:", err);
        }

        // 支付宝要求收到并成功处理后返回纯文本 "success"
        return new Response("success", {
          headers: { "Content-Type": "text/plain" },
        });
      }

      return new Response("success");
    }

    // 3. 查询订单支付状态
    if (url.pathname === "/api/pay/query" && request.method === "GET") {
      const orderId = url.searchParams.get("order_id");
      if (!orderId) {
        return jsonResponse({ ok: false, message: "缺少 order_id 参数" }, 400);
      }
      if (!env.PAY_KV) {
        return jsonResponse({ ok: false, message: "KV 未绑定" }, 500);
      }

      const raw = await env.PAY_KV.get(`order:${orderId}`);
      if (!raw) {
        return jsonResponse({ ok: false, message: "订单不存在" }, 404);
      }

      return jsonResponse({ ok: true, data: JSON.parse(raw) });
    }

    return jsonResponse({ ok: false, message: "接口不存在" }, 404);
  },
};
