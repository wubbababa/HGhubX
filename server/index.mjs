import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_BASE,
  forwardEdgeRequest,
  handleImageRequest,
  handleHlsRequest,
  handleSegmentProxy,
} from "./proxy.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");
const SESSIONS_FILE = path.resolve(__dirname, "sessions.json");

let currentBase = DEFAULT_BASE;
const activeSessions = new Map(); // token -> session info

function loadSessionsFromDisk() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.token && item?.user?.id) {
            activeSessions.set(item.token, item);
          }
        }
      }
    }
  } catch (e) {
    console.error("[server] 加载 sessions.json 失败:", e.message);
  }
}

function saveSessionsToDisk() {
  try {
    const list = Array.from(activeSessions.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[server] 保存 sessions.json 失败:", e.message);
  }
}

loadSessionsFromDisk();

function normalizeAccount(data, origin) {
  const source = data?.user && typeof data.user === "object" ? data.user : data;
  const user = {};
  for (const key of ["id", "username", "nickname", "avatar", "avatar_color", "sign", "desc", "user_type", "counts", "interactions"]) {
    if (source && source[key] !== undefined) user[key] = source[key];
  }
  if (user.id !== undefined && user.id !== null) {
    user.id = Number(user.id);
  }
  const rawInteractions = data?.interactions || user.interactions || {};
  const interactions = {
    favorite_video_ids: Array.isArray(rawInteractions.favorite_video_ids) ? rawInteractions.favorite_video_ids : [],
    like_video_ids: Array.isArray(rawInteractions.like_video_ids) ? rawInteractions.like_video_ids : [],
    follow_user_ids: Array.isArray(rawInteractions.follow_user_ids) ? rawInteractions.follow_user_ids : [],
    like_post_ids: Array.isArray(rawInteractions.like_post_ids) ? rawInteractions.like_post_ids : [],
    favorite_post_ids: Array.isArray(rawInteractions.favorite_post_ids) ? rawInteractions.favorite_post_ids : [],
    ...rawInteractions,
  };
  user.interactions = interactions;
  const tok = data?.token || source?.token || data?.user?.token || data?.access_token || source?.access_token || data?.jwt || data?.auth_token;
  return {
    user,
    origin,
    interactions,
    token: tok,
  };
}

function normalizeAccountHistory(value) {
  const items = Array.isArray(value?.items) ? value.items : [];
  const pagination = value?.pagination && typeof value.pagination === "object" ? value.pagination : { page: 1, pages: 1, size: 50, total: items.length };
  const filtered = items.filter(item => item && item.target_type === "video" && Number(item.id) > 0 && Number(item.video_id) > 0).map(item => ({
    id: Number(item.id),
    video_id: Number(item.video_id),
    target_type: "video",
    last_ep: Math.max(1, Number(item.last_ep) || 1),
    updated_at: String(item.updated_at || ""),
  }));
  return {
    items: filtered,
    pagination,
  };
}

/**
 * 映射前端调用的 cmd 到上游业务接口
 */
export async function executeCommand(cmd, args = {}, authHeader = "") {
  let token = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  }

  switch (cmd) {
    case "app_boot": {
      let user = null;
      let logged_in = false;
      if (token) {
        if (activeSessions.has(token)) {
          user = activeSessions.get(token).user;
          logged_in = true;
        } else {
          try {
            const res = await forwardEdgeRequest({
              origin: currentBase,
              method: "GET",
              path: "/api/account/me",
              token,
            });
            const normalized = normalizeAccount(res, currentBase);
            if (normalized?.user?.id) {
              user = normalized.user;
              logged_in = true;
              activeSessions.set(token, { user: normalized.user, token, cookies: res?._cookies || "" });
              saveSessionsToDisk();
            }
          } catch {
            user = null;
            logged_in = false;
          }
        }
      }
      return {
        user,
        logged_in,
        base: currentBase,
        strict_security: false,
        cli_relaxed: true,
      };
    }
    case "api_login": {
      const res = await forwardEdgeRequest({
        origin: currentBase,
        method: "POST",
        path: "/api/account/loginByPassword",
        body: { username: args.username, password: args.password },
      });
      const normalized = normalizeAccount(res, currentBase);
      const tok = normalized.token || res?.token;
      const cookies = res?._cookies || "";
      if (tok && normalized.user?.id) {
        activeSessions.set(tok, { user: normalized.user, token: tok, cookies });
        saveSessionsToDisk();
      }
      return normalized;
    }
    case "api_register": {
      const res = await forwardEdgeRequest({
        origin: currentBase,
        method: "POST",
        path: "/api/account/registerByPassword",
        body: {
          username: args.username,
          password: args.password,
          confirm_password: args.confirm_password || args.password,
          email: args.email || "",
        },
      });
      const normalized = normalizeAccount(res, currentBase);
      const tok = normalized.token || res?.token;
      const cookies = res?._cookies || "";
      if (tok && normalized.user?.id) {
        activeSessions.set(tok, { user: normalized.user, token: tok, cookies });
        saveSessionsToDisk();
      }
      return normalized;
    }
    case "api_logout": {
      if (token) {
        const cached = activeSessions.get(token);
        try {
          await forwardEdgeRequest({
            origin: currentBase,
            method: "POST",
            path: "/api/account/logout",
            token,
            cookies: cached?.cookies,
          });
        } catch { /* 忽略上游退出错误 */ }
        activeSessions.delete(token);
        saveSessionsToDisk();
      }
      return { ok: true };
    }
    case "api_me": {
      const cached = token ? activeSessions.get(token) : null;
      try {
        const res = await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: "/api/account/me",
          token,
          cookies: cached?.cookies,
        });
        const normalized = normalizeAccount(res, currentBase);
        if (token && normalized.user?.id) {
          activeSessions.set(token, {
            user: { ...(cached?.user || {}), ...normalized.user },
            token,
            cookies: res?._cookies || cached?.cookies || "",
          });
          saveSessionsToDisk();
        }
        return normalized;
      } catch (err) {
        // 如果上游账号验证报错（例如直连端点受限），但本地有当前 token 的活跃会话记录：
        // 回退返回缓存资料，坚决防止误判登出
        if (cached && cached.user?.id) {
          const cachedUser = cached.user;
          const rawInteractions = cachedUser.interactions || {};
          const interactions = {
            favorite_video_ids: Array.isArray(rawInteractions.favorite_video_ids) ? rawInteractions.favorite_video_ids : [],
            like_video_ids: Array.isArray(rawInteractions.like_video_ids) ? rawInteractions.like_video_ids : [],
            follow_user_ids: Array.isArray(rawInteractions.follow_user_ids) ? rawInteractions.follow_user_ids : [],
            like_post_ids: Array.isArray(rawInteractions.like_post_ids) ? rawInteractions.like_post_ids : [],
            favorite_post_ids: Array.isArray(rawInteractions.favorite_post_ids) ? rawInteractions.favorite_post_ids : [],
            ...rawInteractions,
          };
          return {
            user: { ...cachedUser, interactions },
            origin: currentBase,
            interactions,
            token,
          };
        }
        throw err;
      }
    }
    case "api_feed": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_topics": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: "/api/topics",
        token,
      });
    }
    case "api_topic": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/topics/${encodeURIComponent(args.slug || "")}?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_tags": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: "/api/tags",
        token,
      });
    }
    case "api_tag_videos": {
      try {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/videos/tag/${encodeURIComponent(args.tag || "")}?page=${args.page || 1}&size=${args.size || 20}`,
          token,
        });
      } catch {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/tags/${encodeURIComponent(args.tag || "")}/videos?page=${args.page || 1}&size=${args.size || 20}`,
          token,
        });
      }
    }
    case "api_post_tag": {
      try {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/posts/tag/${encodeURIComponent(args.tag || "")}?page=${args.page || 1}&size=${args.size || 20}`,
          token,
        });
      } catch {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/community/tags/${encodeURIComponent(args.tag || "")}/posts?page=${args.page || 1}&size=${args.size || 20}`,
          token,
        });
      }
    }
    case "api_category": {
      const sortParam = args.sort ? `&sort=${encodeURIComponent(args.sort)}` : "";
      try {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/videos/category/${encodeURIComponent(args.cate || "")}?page=${args.page || 1}&size=${args.size || 20}${sortParam}`,
          token,
        });
      } catch {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/category/${encodeURIComponent(args.cate || "")}?page=${args.page || 1}&size=${args.size || 20}${sortParam}`,
          token,
        });
      }
    }
    case "api_original_videos": {
      const sortParam = args.sort ? `&sort=${encodeURIComponent(args.sort)}` : "";
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos/original?cate=${encodeURIComponent(args.cate || "")}&page=${args.page || 1}&size=${args.size || 20}${sortParam}`,
        token,
      });
    }
    case "api_rank": {
      const kind = args.kind || "hot";
      try {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/ranks/${encodeURIComponent(kind)}`,
          token,
        });
      } catch {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/rank?kind=${encodeURIComponent(kind)}`,
          token,
        });
      }
    }
    case "api_search": {
      const kindParam = args.kind ? `&kind=${encodeURIComponent(args.kind)}` : "";
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/search?q=${encodeURIComponent(args.q || "")}&page=${args.page || 1}&size=${args.size || 20}${kindParam}`,
        token,
      });
    }
    case "api_search_hot": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: "/api/search/hot",
        token,
      });
    }
    case "api_posts": {
      const sortParam = args.sort ? `&sort=${encodeURIComponent(args.sort)}` : "";
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/posts?page=${args.page || 1}&size=${args.size || 20}${sortParam}`,
        token,
      });
    }
    case "api_post": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/posts/${args.id}`,
        token,
      });
    }
    case "api_post_playback": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/posts/${args.id}/playback`,
        token,
      });
    }
    case "api_video": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos/${args.id}`,
        token,
      });
    }
    case "api_play": {
      let info = null;
      try {
        info = await forwardEdgeRequest({
          origin: currentBase,
          method: "POST",
          path: `/api/videos/${args.id}/episodes/${args.ep}/playback`,
          body: {},
          token,
        });
      } catch (err) {
        // fallback legacy
      }

      if (!info?.video_url && info?.streams?.main) {
        info.video_url = info.streams.main;
      }
      if (!info?.video_url_hevc && info?.streams?.hevc) {
        info.video_url_hevc = info.streams.hevc;
      }

      if (!info?.video_url) {
        const legacy = await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/videos/${args.id}/play?ep=${args.ep}&page_texts=0`,
          token,
        });
        if (legacy) {
          if (!legacy.video_url && legacy.streams?.main) legacy.video_url = legacy.streams.main;
          if (!legacy.video_url_hevc && legacy.streams?.hevc) legacy.video_url_hevc = legacy.streams.hevc;
          return legacy;
        }
      }
      return info;
    }
    case "api_comments": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos/${args.id}/episodes/${args.ep}/comments?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_comment_send": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "POST",
        path: `/api/videos/${args.id}/episodes/${args.ep}/comments`,
        body: { content: args.text, reply_id: args.replyId ?? null },
        token,
      });
    }
    case "api_like": {
      const cached = token ? activeSessions.get(token) : null;
      const ep = args.ep || 1;
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/videos/${args.id}/like?ep=${ep}`,
        token,
        cookies: cached?.cookies,
      });
    }
    case "api_collect": {
      const cached = token ? activeSessions.get(token) : null;
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/videos/${args.id}/collect`,
        token,
        cookies: cached?.cookies,
      });
    }
    case "api_follow": {
      const cached = token ? activeSessions.get(token) : null;
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/users/${args.uid}/follow`,
        token,
        cookies: cached?.cookies,
      });
    }
    case "api_post_like": {
      const cached = token ? activeSessions.get(token) : null;
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/posts/${args.id}/like`,
        token,
        cookies: cached?.cookies,
      });
    }
    case "api_post_collect": {
      const cached = token ? activeSessions.get(token) : null;
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/posts/${args.id}/collect`,
        token,
        cookies: cached?.cookies,
      });
    }
    case "api_post_comments": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/posts/${args.id}/comments?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_post_categories": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: "/api/site/categories/post",
        token,
      });
    }
    case "api_post_category": {
      const encoded = encodeURIComponent(args.route || "");
      const sort = args.sort ? `&sort=${encodeURIComponent(args.sort)}` : "";
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/posts/category/${encoded}?page=${args.page || 1}&size=${args.size || 20}${sort}`,
        token,
      });
    }
    case "api_related": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos/${args.id}/related`,
        token,
      });
    }
    case "api_following": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos/following?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_user": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/users/${args.id}`,
        token,
      });
    }
    case "api_user_stats": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/users/${args.id}/stats`,
        token,
      });
    }
    case "api_user_videos": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/videos/user/${args.id}?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_account_history": {
      const cached = token ? activeSessions.get(token) : null;
      const page = Math.max(1, Number(args.page) || 1);
      const size = Math.min(100, Math.max(1, Number(args.size) || 50));
      try {
        const res = await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: `/api/users/me/history?page=${page}&size=${size}`,
          token,
          cookies: cached?.cookies,
        });
        return normalizeAccountHistory(res);
      } catch (err) {
        // 上游历史接口不可达或未授权（例如直连受限）时安全返回空历史，绝不能把 401 抛给前端导致登出报错
        return {
          items: [],
          pagination: { page, pages: 1, size, total: 0 },
        };
      }
    }
    case "api_account_history_record": {
      const cached = token ? activeSessions.get(token) : null;
      try {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "POST",
          path: "/api/users/me/history",
          body: { video_id: args.videoId, ep: args.ep },
          token,
          cookies: cached?.cookies,
        });
      } catch (err) {
        return { ok: true };
      }
    }
    case "api_account_history_delete": {
      const cached = token ? activeSessions.get(token) : null;
      try {
        return await forwardEdgeRequest({
          origin: currentBase,
          method: "POST",
          path: "/api/users/me/history/delete",
          body: { ids: args.ids },
          token,
          cookies: cached?.cookies,
        });
      } catch (err) {
        return { ok: true };
      }
    }
    case "line_state": {
      return {
        base: currentBase,
        default: DEFAULT_BASE,
        fixed: [
          { name: "官方主线路", url: DEFAULT_BASE, host: new URL(DEFAULT_BASE).host },
        ],
        custom: currentBase !== DEFAULT_BASE,
      };
    }
    case "line_mirrors": {
      return {
        source: "https://huang-guo.pages.dev/",
        items: [
          { name: "官方主线路", url: DEFAULT_BASE, host: new URL(DEFAULT_BASE).host },
        ],
        recommended_source: "https://huang-guo.pages.dev/",
        recommended: [
          { name: "官方主线路", url: DEFAULT_BASE, host: new URL(DEFAULT_BASE).host },
        ],
      };
    }
    case "line_probe": {
      const urls = Array.isArray(args.urls) ? args.urls : [];
      const results = [];
      for (const u of urls) {
        const start = Date.now();
        try {
          await fetch(`${u.replace(/\/+$/, "")}/api/videos?page=1&size=1`, {
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          results.push({ url: u, ok: true, status: 200, ms: Date.now() - start });
        } catch (e) {
          results.push({ url: u, ok: false, ms: Date.now() - start, error: e.message });
        }
      }
      return results;
    }
    case "line_health": {
      const start = Date.now();
      try {
        await forwardEdgeRequest({
          origin: currentBase,
          method: "GET",
          path: "/api/videos?page=1&size=1",
        });
        return { base: currentBase, ok: true, ms: Date.now() - start, status: 200 };
      } catch (e) {
        return { base: currentBase, ok: false, ms: Date.now() - start, status: null };
      }
    }
    case "line_set":
    case "line_custom_set": {
      if (args.url) {
        currentBase = args.url.replace(/\/+$/, "");
      }
      return { base: currentBase, custom: currentBase !== DEFAULT_BASE };
    }
    case "line_reset": {
      currentBase = DEFAULT_BASE;
      return { base: currentBase, custom: false };
    }
    case "line_auto": {
      return {
        base: currentBase,
        switched: false,
        cancelled: false,
        pick: {
          tier: "main",
          ms: 50,
          reason: "ok",
          candidates: [
            { tier: "main", ok: true, reachable: true, ms: 50 }
          ]
        }
      };
    }
    case "line_try_main": {
      return {
        base: currentBase,
        switched: false,
        cancelled: false,
        probe: { ok: true, ms: 50 }
      };
    }
    case "line_cancel": {
      return { ok: true };
    }
    case "proxy_state": {
      return { mode: "off", url: "" };
    }
    case "check_update": {
      return {
        current: "web",
        latest: "web",
        has_update: false,
        url: "",
      };
    }
    case "open_url": {
      return { ok: true };
    }
    default:
      throw new Error(`未知命令: ${cmd}`);
  }
}

/**
 * Node.js HTTP 请求主分发器
 */
export async function dispatchServerRequest(req, res, prefix = "") {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;

  // 允许跨域（方便本地前后端不同端口开发）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // 1. /api/invoke/:cmd (RPC 风格调用)
  if (pathname.startsWith("/api/invoke/")) {
    const cmd = pathname.slice("/api/invoke/".length);
    let bodyText = "";
    req.on("data", (chunk) => { bodyText += chunk; });
    req.on("end", async () => {
      try {
        const args = bodyText ? JSON.parse(bodyText) : {};
        const result = await executeCommand(cmd, args, req.headers.authorization || "");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // 1.1 /api/edge/request (兼容旧版手机 App 信封请求网关)
  if (pathname === "/api/edge/request" && req.method === "POST") {
    let bodyText = "";
    req.on("data", (chunk) => { bodyText += chunk; });
    req.on("end", async () => {
      try {
        const envelope = bodyText ? JSON.parse(bodyText) : {};
        let decodedBody = undefined;
        if (envelope.body) {
          try {
            decodedBody = JSON.parse(Buffer.from(envelope.body, "base64").toString("utf8"));
          } catch {
            decodedBody = {};
          }
        }
        let auth = req.headers.authorization || "";
        let token = "";
        if (auth.startsWith("Bearer ")) token = auth.slice(7);

        let p = envelope.path || "";
        // 自动兼容新版路由别名
        if (p.startsWith("/api/rank?kind=")) {
          const u = new URL(`http://localhost${p}`);
          p = `/api/ranks/${u.searchParams.get("kind") || "hot"}`;
        } else if (p.startsWith("/api/tags/") && p.endsWith("/videos")) {
          const m = p.match(/^\/api\/tags\/([^/]+)\/videos/);
          if (m) p = `/api/videos/tag/${m[1]}`;
        } else if (p.startsWith("/api/category/")) {
          p = p.replace(/^\/api\/category\//, "/api/videos/category/");
        }

        const data = await forwardEdgeRequest({
          origin: currentBase,
          method: envelope.method || "GET",
          path: p,
          body: decodedBody,
          token,
        });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
          status: 1,
          msg: "",
          data: data,
          req_time: Math.floor(Date.now() / 1000),
        }));
      } catch (err) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
          status: 0,
          msg: err.message || "请求失败",
          data: null,
          req_time: Math.floor(Date.now() / 1000),
        }));
      }
    });
    return true;
  }

  // 2. /hg/img?u=... (封面图片解密代理)
  if (pathname === "/hg/img") {
    const targetUrl = urlObj.searchParams.get("u");
    if (!targetUrl) {
      res.statusCode = 400;
      res.end("Missing u parameter");
      return true;
    }
    try {
      const { data, mime } = await handleImageRequest(targetUrl);
      res.statusCode = 200;
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(data);
    } catch (err) {
      res.statusCode = 502;
      res.end(err.message);
    }
    return true;
  }

  // 3. /hg/hls?u=... (m3u8 播放列表改写代理)
  if (pathname === "/hg/hls") {
    const targetUrl = urlObj.searchParams.get("u");
    if (!targetUrl) {
      res.statusCode = 400;
      res.end("Missing u parameter");
      return true;
    }
    try {
      const manifest = await handleHlsRequest(targetUrl, "/hg");
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.end(manifest);
    } catch (err) {
      res.statusCode = 502;
      res.end(err.message);
    }
    return true;
  }

  // 4. /hg/seg?u=... (视频分片 / Key / mp4 透传代理)
  if (pathname === "/hg/seg") {
    const targetUrl = urlObj.searchParams.get("u");
    if (!targetUrl) {
      res.statusCode = 400;
      res.end("Missing u parameter");
      return true;
    }
    try {
      const upstreamRes = await handleSegmentProxy(targetUrl, req.headers);
      res.statusCode = upstreamRes.status;
      for (const [k, v] of upstreamRes.headers.entries()) {
        if (!["content-encoding", "transfer-encoding"].includes(k.toLowerCase())) {
          res.setHeader(k, v);
        }
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      const arrayBuffer = await upstreamRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      res.statusCode = 502;
      res.end(err.message);
    }
    return true;
  }

  return false;
}

// 若作为主程序运行，启动完整静态托管服务
if (process.argv[1] && process.argv[1].endsWith("index.mjs")) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(async (req, res) => {
    const handled = await dispatchServerRequest(req, res);
    if (handled) return;

    // 静态文件托管
    let reqPath = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (reqPath === "/") reqPath = "/index.html";
    let filePath = path.join(DIST_DIR, reqPath);

    if (!fs.existsSync(filePath)) {
      // SPA Fallback
      filePath = path.join(DIST_DIR, "index.html");
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".ico": "image/x-icon",
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.statusCode = 404;
      res.end("Not Found (dist folder not built yet, run pnpm build first)");
    }
  });

  server.listen(PORT, () => {
    console.log(`HGhubX Web 全栈服务器已启动: http://localhost:${PORT}`);
  });
}
