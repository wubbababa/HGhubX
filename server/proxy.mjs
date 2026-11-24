import { decryptImage } from "./crypto.mjs";
import { rewritePlaylist } from "./hls.mjs";

export const DEFAULT_BASE = "https://huangguoai.com";

// 内存缓存
const imgCache = new Map();
const plCache = new Map();

/**
 * 向上游站点发起业务接口请求（兼容直连与信封代理）
 */
export async function forwardEdgeRequest({ origin = DEFAULT_BASE, method = "GET", path, body, token }) {
  const cur = origin.replace(/\/+$/, "");
  const targetUrl = path.startsWith("http") ? path : `${cur}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Referer": `${cur}/`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  if (token) {
    if (/[\r\n;]/.test(token)) throw new Error("登录令牌格式无效");
    headers["Authorization"] = `Bearer ${token}`;
    // Upstream account endpoints authenticate with the HttpOnly session cookie.
    // The Web proxy does not share the upstream cookie jar, so mirror the token here.
    headers["Cookie"] = `_USER_TOKEN_=${token}; _LOGIN_=1`;
  }

  const httpMethod = (method || "GET").toUpperCase();
  const options = {
    method: httpMethod,
    headers,
  };

  if (httpMethod !== "GET" && httpMethod !== "HEAD") {
    headers["Content-Type"] = "application/json";
    options.body = body !== undefined && body !== null ? JSON.stringify(body) : JSON.stringify({});
  }

  const res = await fetch(targetUrl, options);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
  }

  if (!text.trim()) {
    return null;
  }

  try {
    const json = JSON.parse(text);
    if (!json) return null;
    if (json.status === 1) {
      if (json.data && typeof json.data === "object" && !Array.isArray(json.data)) {
        if (json.token && !json.data.token) json.data.token = json.token;
        if (json.access_token && !json.data.access_token) json.data.access_token = json.access_token;
      }
      return json.data !== undefined ? json.data : json;
    }
    if (json.status === undefined && json.data !== undefined) {
      if (json.data && typeof json.data === "object" && !Array.isArray(json.data)) {
        if (json.token && !json.data.token) json.data.token = json.token;
        if (json.access_token && !json.data.access_token) json.data.access_token = json.access_token;
      }
      return json.data;
    }
    if (json.status === undefined) {
      return json;
    }
    throw new Error(json.msg || "接口返回失败");
  } catch (err) {
    if (err.message && !err.message.includes("JSON")) {
      throw err;
    }
    throw new Error(`解析响应 JSON 失败: ${err.message} (${text.slice(0, 100)})`);
  }
}

/**
 * 获取并解密封面
 */
export async function handleImageRequest(targetUrl) {
  if (imgCache.has(targetUrl)) {
    return imgCache.get(targetUrl);
  }

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`图片下载失败: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const rawBuf = Buffer.from(arrayBuffer);
  const { data, mime } = decryptImage(rawBuf);

  const result = { data, mime };
  if (imgCache.size > 500) {
    const firstKey = imgCache.keys().next().value;
    imgCache.delete(firstKey);
  }
  imgCache.set(targetUrl, result);

  return result;
}

/**
 * 获取并改写 HLS 播放列表
 */
export async function handleHlsRequest(manifestUrl, prefix = "/hg") {
  if (plCache.has(manifestUrl)) {
    return plCache.get(manifestUrl);
  }

  const res = await fetch(manifestUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`播放列表获取失败: HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text.includes("#EXTM3U")) {
    throw new Error("响应不是有效 HLS 播放列表");
  }

  const rewritten = rewritePlaylist(manifestUrl, text, prefix);
  if (plCache.size > 200) {
    const firstKey = plCache.keys().next().value;
    plCache.delete(firstKey);
  }
  plCache.set(manifestUrl, rewritten);

  return rewritten;
}

/**
 * 透传代理分片 / key / mp4
 */
export async function handleSegmentProxy(targetUrl, incomingHeaders = {}) {
  const reqHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  if (incomingHeaders.range) {
    reqHeaders["Range"] = incomingHeaders.range;
  }

  const res = await fetch(targetUrl, {
    headers: reqHeaders,
  });

  return res;
}
