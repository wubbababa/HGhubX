/**
 * 解析绝对地址
 */
function absolutize(base, uri) {
  try {
    return new URL(uri, base).href;
  } catch {
    return uri;
  }
}

/**
 * 改写 URI 属性，如 URI="path/to/key" -> URI="/hg/seg?u=http%3A%2F%2F..."
 */
function rewriteUriAttr(line, baseUrl, prefix) {
  return line.replace(/URI="([^"]+)"/g, (_, uri) => {
    const abs = absolutize(baseUrl, uri);
    return `URI="${prefix}/seg?u=${encodeURIComponent(abs)}"`;
  });
}

/**
 * 改写 HLS 播放列表 m3u8
 * @param {string} manifestUrl 原始 m3u8 地址
 * @param {string} text m3u8 内容
 * @param {string} prefix 媒体代理前缀（例如 /hg）
 */
export function rewritePlaylist(manifestUrl, text, prefix = "/hg") {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) {
      out.push("");
      continue;
    }

    if (raw.startsWith("#")) {
      // 禁用内容引导
      if (raw.startsWith("#EXT-X-CONTENT-STEERING:")) {
        continue;
      }
      if (raw.includes('URI="')) {
        out.push(rewriteUriAttr(raw, manifestUrl, prefix));
      } else {
        out.push(raw);
      }
    } else {
      // 分片地址
      const abs = absolutize(manifestUrl, raw);
      out.push(`${prefix}/seg?u=${encodeURIComponent(abs)}`);
    }
  }

  return out.join("\n");
}
