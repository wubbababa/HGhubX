import type { User } from "./types";

/** 非 VIP 试看限制时长（秒） */
export const VIP_TRIAL_LIMIT_SECONDS = 60;

const DEFAULT_CFVIP_BASE = "https://cfvip.accessible-grenadilla.workers.dev";
export const CFVIP_BASE = ((import.meta as any).env?.VITE_CFVIP_URL || DEFAULT_CFVIP_BASE).replace(/\/+$/, "");

const VIP_STORAGE_PREFIX = "hghubx_vip_cache_";

export interface VipCacheInfo {
  is_vip: boolean;
  expire_at: number | null;
  checked_at: number;
}

/**
 * 从本地缓存获取用户的 VIP 状态
 */
export function getLocalVipStatus(username?: string): boolean {
  if (!username) return false;
  try {
    const raw = localStorage.getItem(`${VIP_STORAGE_PREFIX}${username.trim()}`);
    if (!raw) return false;
    const cache: VipCacheInfo = JSON.parse(raw);
    if (!cache.is_vip) return false;
    if (cache.expire_at && cache.expire_at <= Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 更新本地用户的 VIP 缓存
 */
export function setLocalVipStatus(username: string, is_vip: boolean, expire_at: number | null = null): void {
  if (!username) return;
  try {
    const cache: VipCacheInfo = {
      is_vip,
      expire_at,
      checked_at: Date.now(),
    };
    localStorage.setItem(`${VIP_STORAGE_PREFIX}${username.trim()}`, JSON.stringify(cache));
  } catch {
    // 忽略本地存储异常
  }
}

/**
 * 校验当前用户是否为 VIP 用户
 * - 规则：
 *   1. 必须已登录
 *   2. user.user_type === "vip"（不区分大小写）
 *   3. 或本地缓存记录该用户为有效未过期的 VIP
 */
export function checkIsVip(user: User | null | undefined): boolean {
  if (!user || !user.username) {
    return false;
  }
  const type = (user.user_type || "").trim().toLowerCase();
  if (type === "vip") {
    return true;
  }
  return getLocalVipStatus(user.username);
}

/**
 * 异步从 CFvip 远程端点同步最新 VIP 状态
 */
export async function syncVipStatusFromRemote(user: User | null | undefined): Promise<boolean> {
  if (!user || !user.username) {
    return false;
  }
  try {
    const username = encodeURIComponent(user.username.trim());
    const res = await fetch(`${CFVIP_BASE}/api/vip/check?username=${username}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return checkIsVip(user);
    const data = await res.json();
    if (data.ok) {
      const isVip = !!data.is_vip;
      setLocalVipStatus(user.username, isVip, data.expire_at || null);
      if (isVip) {
        user.user_type = "vip";
      }
      try {
        window.dispatchEvent(new CustomEvent("hg:vip-changed", { detail: { username: user.username, is_vip: isVip } }));
      } catch {}
      return isVip;
    }
  } catch {
    // 网络异常时回退到已有状态
  }
  return checkIsVip(user);
}

/**
 * 判断是否受到非 VIP 试看限制
 */
export function shouldEnforceVipTrial(user: User | null | undefined): boolean {
  return !checkIsVip(user);
}

/**
 * 对目标跳转时间限制在试看范围内（若受限）
 */
export function clampSeekTime(target: number, user: User | null | undefined): number {
  if (!shouldEnforceVipTrial(user)) {
    return Math.max(0, target);
  }
  return Math.max(0, Math.min(VIP_TRIAL_LIMIT_SECONDS, target));
}
