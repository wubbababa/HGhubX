import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "../api";

const MAP: [string, string][] = [
  ["n", "North"], ["s", "South"], ["e", "East"], ["w", "West"],
  ["ne", "NorthEast"], ["nw", "NorthWest"], ["se", "SouthEast"], ["sw", "SouthWest"],
];

/** 无边框窗口的边缘拖拽缩放（Windows / Linux Tauri 客户端）。Web 模式下返回 null */
export default function ResizeHandles() {
  if (!isTauriApp) return null;
  const win = getCurrentWindow();
  return (
    <div className="pointer-events-none absolute inset-0 z-[70]">
      {MAP.map(([edge, dir]) => (
        <div key={edge}
          className={`win-resize win-resize-${edge} pointer-events-auto`}
          onPointerDown={(e) => {
            e.preventDefault();
            // ResizeDirection 在类型包里未导出，按字符串传入
            (win.startResizeDragging as unknown as (d: string) => Promise<void>)(dir).catch(() => {});
          }}
        />
      ))}
    </div>
  );
}