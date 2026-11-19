import crypto from "node:crypto";

const IMG_KEY = Buffer.from("f5d965df75336270", "utf8");
const IMG_IV = Buffer.from("97b60394abc2fbe1", "utf8");

/**
 * 判断是否为已知明文图片类型
 */
export function imageKind(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.toString("utf8", 0, 4) === "GIF8") return "image/gif";
  if (buf.toString("utf8", 0, 4) === "RIFF" && buf.toString("utf8", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * 解密 AES-128-CBC 封面图
 */
export function decryptImage(buf) {
  const plainType = imageKind(buf);
  if (plainType) {
    return { data: buf, mime: plainType };
  }

  try {
    const decipher = crypto.createDecipheriv("aes-128-cbc", IMG_KEY, IMG_IV);
    decipher.setAutoPadding(true);
    const decrypted = Buffer.concat([decipher.update(buf), decipher.final()]);
    const mime = imageKind(decrypted) || "image/jpeg";
    return { data: decrypted, mime };
  } catch (err) {
    // 某些封面可能已经是某种变体，尝试不去除 padding
    try {
      const decipherNoPad = crypto.createDecipheriv("aes-128-cbc", IMG_KEY, IMG_IV);
      decipherNoPad.setAutoPadding(false);
      const dec = Buffer.concat([decipherNoPad.update(buf), decipherNoPad.final()]);
      const mime = imageKind(dec) || "image/jpeg";
      return { data: dec, mime };
    } catch {
      throw new Error(`封面解密失败: ${err.message}`);
    }
  }
}
