import { useSyncExternalStore } from "react";
import { isTauriApp } from "./api";
import { CFVIP_BASE } from "./vip";

const WHITELIST_CACHE_KEY = "hghubx_whitelist_cache_v1";

export type WhitelistState = {
  /** 仅 Web 端启用白名单拉取；Tauri 客户端直接视为 ready 且不启用 */
  status: "idle" | "loading" | "ready";
  enabled: boolean;
  ids: number[];
  idSet: ReadonlySet<number>;
  updatedAt: string | null;
};

function normalizeIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const item of raw) {
    const num = typeof item === "number" ? item : Number.parseInt(String(item), 10);
    if (Number.isSafeInteger(num) && num > 0 && !seen.has(num)) {
      seen.add(num);
      ids.push(num);
    }
  }
  return ids;
}

function readCachedWhitelist(): { enabled: boolean; ids: number[]; updatedAt: string | null } | null {
  if (isTauriApp) return null;
  try {
    const raw = localStorage.getItem(WHITELIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed?.enabled === true,
      ids: normalizeIds(parsed?.ids),
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

function writeCachedWhitelist(data: { enabled: boolean; ids: number[]; updatedAt: string | null }) {
  if (isTauriApp) return;
  try {
    localStorage.setItem(WHITELIST_CACHE_KEY, JSON.stringify(data));
  } catch {
    // 忽略存储异常
  }
}

const initialState: WhitelistState = isTauriApp
  ? { status: "ready", enabled: false, ids: [], idSet: new Set(), updatedAt: null }
  : { status: "idle", enabled: false, ids: [], idSet: new Set(), updatedAt: null };

let state: WhitelistState = initialState;
let inflight: Promise<WhitelistState> | null = null;
const listeners = new Set<() => void>();

function setState(next: WhitelistState) {
  state = next;
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

/** 从 CFvip 拉取 Web 端视频白名单配置 */
export async function loadWhitelistConfig(force = false): Promise<WhitelistState> {
  if (isTauriApp) return state;
  if (!force && state.status === "ready") return state;
  if (inflight) return inflight;

  if (state.status === "idle") {
    setState({ ...state, status: "loading" });
  }

  inflight = (async () => {
    try {
      const res = await fetch(`${CFVIP_BASE}/api/whitelist`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.message || "白名单响应异常");
      const ids = normalizeIds(data.ids);
      const enabled = data.enabled === true;
      const updatedAt = typeof data.updated_at === "string" ? data.updated_at : null;
      writeCachedWhitelist({ enabled, ids, updatedAt });
      const next: WhitelistState = {
        status: "ready",
        enabled,
        ids,
        idSet: new Set(ids),
        updatedAt,
      };
      setState(next);
      return next;
    } catch {
      const cached = readCachedWhitelist();
      const next: WhitelistState = cached
        ? {
            status: "ready",
            enabled: cached.enabled,
            ids: cached.ids,
            idSet: new Set(cached.ids),
            updatedAt: cached.updatedAt,
          }
        : {
            status: "ready",
            enabled: false,
            ids: [],
            idSet: new Set(),
            updatedAt: null,
          };
      setState(next);
      return next;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** 当前是否处于 Web 端白名单限制模式 */
export function isWhitelistActive(): boolean {
  return !isTauriApp && state.status === "ready" && state.enabled;
}

/** 判断视频 ID 是否允许在当前端展示和播放 */
export function isVideoAllowed(videoId: number | string | null | undefined): boolean {
  if (!isWhitelistActive()) return true;
  const id = typeof videoId === "number" ? videoId : Number.parseInt(String(videoId ?? ""), 10);
  return Number.isSafeInteger(id) && state.idSet.has(id);
}

/** 按当前白名单过滤列表（支持 id 或 video_id 字段） */
export function filterAllowedVideos<T extends { id?: number; video_id?: number }>(items: readonly T[]): T[] {
  if (!isWhitelistActive()) return items as T[];
  return items.filter((item) => isVideoAllowed(item.id ?? item.video_id));
}

export function useVideoWhitelist() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const active = !isTauriApp && current.status === "ready" && current.enabled;
  return {
    ...current,
    active,
    isAllowed: (id: number | string | null | undefined) => !active || current.idSet.has(Number(id)),
  };
}
