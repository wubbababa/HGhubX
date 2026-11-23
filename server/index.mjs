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

let currentBase = DEFAULT_BASE;
const activeSessions = new Map(); // token -> session info

function normalizeAccount(data, origin) {
  const source = data?.user && typeof data.user === "object" ? data.user : data;
  const user = {};
  for (const key of ["id", "username", "nickname", "avatar", "avatar_color", "sign", "desc", "user_type", "counts", "interactions"]) {
    if (source && source[key] !== undefined) user[key] = source[key];
  }
  const interactions = data?.interactions || user.interactions;
  if (interactions) user.interactions = interactions;
  return {
    user,
    origin,
    interactions,
    token: data?.token,
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
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  switch (cmd) {
    case "app_boot": {
      const sess = token && activeSessions.has(token) ? activeSessions.get(token) : null;
      return {
        user: sess ? sess.user : null,
        logged_in: !!sess,
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
      if (res?.token) {
        activeSessions.set(res.token, { user: normalized.user, token: res.token });
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
      if (res?.token) {
        activeSessions.set(res.token, { user: normalized.user, token: res.token });
      }
      return normalized;
    }
    case "api_logout": {
      if (token) {
        try {
          await forwardEdgeRequest({
            origin: currentBase,
            method: "POST",
            path: "/api/account/logout",
            token,
          });
        } catch { /* 忽略上游退出错误 */ }
        activeSessions.delete(token);
      }
      return { ok: true };
    }
    case "api_me": {
      const res = await forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: "/api/account/me",
        token,
      });
      const normalized = normalizeAccount(res, currentBase);
      if (token && normalized.user?.id) {
        activeSessions.set(token, { user: normalized.user, token });
      }
      return normalized;
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
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/tags/${encodeURIComponent(args.tag || "")}/videos?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_post_tag": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/community/tags/${encodeURIComponent(args.tag || "")}/posts?page=${args.page || 1}&size=${args.size || 20}`,
        token,
      });
    }
    case "api_category": {
      const sortParam = args.sort ? `&sort=${encodeURIComponent(args.sort)}` : "";
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/category/${encodeURIComponent(args.cate || "")}?page=${args.page || 1}&size=${args.size || 20}${sortParam}`,
        token,
      });
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
      return forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/rank?kind=${encodeURIComponent(args.kind || "hot")}`,
        token,
      });
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
      const ep = args.ep || 1;
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/videos/${args.id}/like?ep=${ep}`,
        token,
      });
    }
    case "api_collect": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/videos/${args.id}/collect`,
        token,
      });
    }
    case "api_follow": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/users/${args.uid}/follow`,
        token,
      });
    }
    case "api_post_like": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/posts/${args.id}/like`,
        token,
      });
    }
    case "api_post_collect": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: args.on ? "POST" : "DELETE",
        path: `/api/posts/${args.id}/collect`,
        token,
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
      const page = Math.max(1, Number(args.page) || 1);
      const size = Math.min(100, Math.max(1, Number(args.size) || 50));
      const res = await forwardEdgeRequest({
        origin: currentBase,
        method: "GET",
        path: `/api/users/me/history?page=${page}&size=${size}`,
        token,
      });
      return normalizeAccountHistory(res);
    }
    case "api_account_history_record": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "POST",
        path: "/api/users/me/history",
        body: { video_id: args.videoId, ep: args.ep },
        token,
      });
    }
    case "api_account_history_delete": {
      return forwardEdgeRequest({
        origin: currentBase,
        method: "POST",
        path: "/api/users/me/history/delete",
        body: { ids: args.ids },
        token,
      });
    }
    case "line_state": {
      return {
        base: currentBase,
        default: DEFAULT_BASE,
        fixed: [{ name: "官方主线路", url: DEFAULT_BASE, host: new URL(DEFAULT_BASE).host }],
        custom: currentBase !== DEFAULT_BASE,
      };
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
