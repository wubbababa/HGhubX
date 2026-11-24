/**
 * alipay.js
 * 纯 Web Crypto API 实现的支付宝 RSA2 (SHA256withRSA) 签名与验签工具
 * 完美适配 Cloudflare Workers 无需引入 node 依赖
 */

// 格式化时间: YYYY-MM-DD HH:mm:ss（北京时间 UTC+8）
export function getAlipayTimestamp() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// 清理 PEM 格式，保留纯 Base64 内容（过滤换行字面量 \n、引号、不可见字符等）
function cleanPem(pem) {
  if (!pem) return "";
  return pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
}

// Base64 转 ArrayBuffer，支持自动补齐 '='
function base64ToArrayBuffer(b64) {
  const pad = b64.length % 4;
  if (pad === 2) b64 += "==";
  else if (pad === 3) b64 += "=";

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 将 PKCS#1 (传统 RSA 私钥) 自动包装为 PKCS#8 格式
function convertPkcs1ToPkcs8(pkcs1Buffer) {
  const pkcs1Bytes = new Uint8Array(pkcs1Buffer);
  function encodeLength(len) {
    if (len < 128) return [len];
    const bytes = [];
    while (len > 0) {
      bytes.unshift(len & 0xff);
      len >>= 8;
    }
    return [0x80 | bytes.length, ...bytes];
  }

  const version = [0x02, 0x01, 0x00];
  const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octetHeader = [0x04, ...encodeLength(pkcs1Bytes.length)];
  
  const innerLen = version.length + algId.length + octetHeader.length + pkcs1Bytes.length;
  const seqHeader = [0x30, ...encodeLength(innerLen)];

  const pkcs8 = new Uint8Array(seqHeader.length + innerLen);
  let offset = 0;
  pkcs8.set(seqHeader, offset); offset += seqHeader.length;
  pkcs8.set(version, offset); offset += version.length;
  pkcs8.set(algId, offset); offset += algId.length;
  pkcs8.set(octetHeader, offset); offset += octetHeader.length;
  pkcs8.set(pkcs1Bytes, offset);

  return pkcs8.buffer;
}

// ArrayBuffer 转 Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将参数对象转换为待签名的字符串（ASCII 字典序排序）
 * - 发起支付请求时：仅排除 sign（sign_type 需要参与签名）
 * - 异步通知验签时：排除 sign 和 sign_type（isNotify = true）
 */
export function buildSignContent(params, isNotify = false) {
  const excludeKeys = isNotify ? ["sign", "sign_type"] : ["sign"];
  const keys = Object.keys(params)
    .filter((k) => !excludeKeys.includes(k) && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort();

  return keys.map((k) => `${k}=${params[k]}`).join("&");
}

/**
 * RSA2 (SHA256withRSA) 私钥签名
 */
export async function signParams(params, privateKeyPem) {
  const content = buildSignContent(params, false);
  const rawKey = base64ToArrayBuffer(cleanPem(privateKeyPem));

  // 密钥合法性与特征预检
  if (!rawKey || rawKey.byteLength === 0) {
    throw new Error("ALIPAY_PRIVATE_KEY 为空，请先注入有效私钥");
  }
  if (rawKey.byteLength < 600) {
    throw new Error(
      `ALIPAY_PRIVATE_KEY 长度异常(仅 ${rawKey.byteLength} 字节)。2048位私钥通常大于1100字节，您很可能误填了【公钥】(约290字节)，请检查开放平台助手中的【应用私钥】`
    );
  }

  let privateKey;
  try {
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      rawKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
  } catch (pkcs8Err) {
    // 若直接解析 pkcs8 失败，尝试作为 PKCS#1 包装后再试
    try {
      const wrappedKey = convertPkcs1ToPkcs8(rawKey);
      privateKey = await crypto.subtle.importKey(
        "pkcs8",
        wrappedKey,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );
    } catch {
      throw pkcs8Err;
    }
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, data);

  return arrayBufferToBase64(signature);
}

/**
 * RSA2 (SHA256withRSA) 支付宝公钥验签
 */
export async function verifyAlipaySignature(params, alipayPublicKeyPem) {
  const sign = params.sign;
  if (!sign) return false;

  const content = buildSignContent(params, true);
  const rawKey = base64ToArrayBuffer(cleanPem(alipayPublicKeyPem));

  const publicKey = await crypto.subtle.importKey(
    "spki",
    rawKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const signature = base64ToArrayBuffer(sign);

  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, data);
}
