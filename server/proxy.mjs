import { decryptImage } from "./crypto.mjs";
import { rewritePlaylist } from "./hls.mjs";

export const DEFAULT_BASE = "https://huangguoai.com";

// 内存缓存
const imgCache = new Map();
const plCache = new Map();

/**
 * 转发信封请求到上游站点 /api/edge/request
 */
export async function forwardEdgeRequest({ origin = DEFAULT_BASE, method, path, body, token }) {
  const cur = origin.replace(/\/+$/, "");
  const envelope = {
    method: method || "GET",
    path: path || "",
    body: body ? Buffer.from(JSON.stringify(body)).toString("base64") : "",
    content_type: body ? "application/json" : "",
  };

  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Referer": `${cur}/`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const upstreamUrl = `${cur}/api/edge/request`;
  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(envelope),
  });

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
      return json.data ?? null;
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
