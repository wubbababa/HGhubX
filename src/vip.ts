import type { User } from "./types";

/** 非 VIP 试看限制时长（秒） */
export const VIP_TRIAL_LIMIT_SECONDS = 60;

/**
 * 校验当前用户是否为 VIP 用户
 * - 规则：
 *   必须登录且 user.user_type === "vip"（不区分大小写）
 */
export function checkIsVip(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }
  const type = (user.user_type || "").trim().toLowerCase();
  return type === "vip";
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
