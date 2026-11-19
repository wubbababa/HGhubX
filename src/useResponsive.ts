import { useState, useEffect } from "react";
import { isMobile as isMobileDevice } from "./api";

/**
 * 响应式视口检测 Hook
 * - 响应式断点设置为 768px（标准平板/移动设备与桌面分界线）
 * - 兼顾物理触屏移动设备和桌面浏览器窗口拉伸
 */
export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 视口宽度是否小于或等于 768px（移动端/窄屏模式）
  const isNarrow = windowWidth <= 768;

  // 是否呈现为移动端视图：
  // 1. 在物理手机（Android / iOS）上默认总是移动端视图（除非横屏宽度很大）
  // 2. 在 PC 浏览器拉窄窗口时自动切换为移动端视图
  const isMobileView = isMobileDevice ? windowWidth <= 1024 : isNarrow;
  const isDesktopView = !isMobileView;

  return {
    windowWidth,
    isNarrow,
    isMobileView,
    isDesktopView,
  };
}
