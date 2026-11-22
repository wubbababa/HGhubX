/**
 * alipay.js
 * 纯 Web Crypto API 实现的支付宝 RSA2 (SHA256withRSA) 签名与验签工具
 * 完美适配 Cloudflare Workers 无需引入 node 依赖
 */

// 格式化时间: YYYY-MM-DD HH:mm:ss
export function getAlipayTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 清理 PEM 格式，保留 Base64 内容
function cleanPem(pem) {
  return pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/[\r\n\s]/g, "");
}

// Base64 转 ArrayBuffer
function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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
 * 将参数对象转换为待签名的字符串（ASCII 排序，剔除 sign 与空值）
 */
export function buildSignContent(params) {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort();

  return keys.map((k) => `${k}=${params[k]}`).join("&");
}

/**
 * RSA2 (SHA256withRSA) 私钥签名
 */
export async function signParams(params, privateKeyPem) {
  const content = buildSignContent(params);
  const rawKey = base64ToArrayBuffer(cleanPem(privateKeyPem));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

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

  const content = buildSignContent(params);
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
