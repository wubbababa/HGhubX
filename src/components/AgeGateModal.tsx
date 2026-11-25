import { useState } from "react";
import { isTauriApp } from "../api";
import { Button } from "./ios/controls";

const AGE_VERIFIED_KEY = "hghubx_age_verified_v1";

/** 检查当前 Web 端是否已通过 18+ 年龄确认（非 Web 端直接放行） */
export function hasVerifiedAge(): boolean {
  if (isTauriApp) return true;
  try {
    return localStorage.getItem(AGE_VERIFIED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Web 端首屏 18+ 年龄限制门禁弹窗 */
export default function AgeGateModal({ onConfirm }: { onConfirm: () => void }) {
  const [declined, setDeclined] = useState(false);

  const confirm = () => {
    try {
      localStorage.setItem(AGE_VERIFIED_KEY, "1");
    } catch {
      // 隐私模式或存储受限时仍允许本次会话继续
    }
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-desc"
    >
      <div className="w-full max-w-md rounded-(--r-lg) border border-line bg-s1 p-6 shadow-2xl">
        <div className="mb-3 inline-flex items-center rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-[12px] font-semibold text-primary">
          18+ 成人内容分级提示
        </div>
        <h1 id="age-gate-title" className="text-[20px] font-bold text-on">
          {declined ? "无法访问本站内容" : "请确认您已年满 18 周岁"}
        </h1>
        {declined ? (
          <>
            <p id="age-gate-desc" className="mt-3 text-[14px] leading-relaxed text-mut">
              本网站仅面向年满 18 周岁（或您所在司法管辖区法定成年年龄）的成年人开放。由于您未确认成年身份，已阻止加载任何视频与图文内容，请关闭本页面。
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="primary"
                className="min-h-11 flex-1 rounded-(--r-ctl)"
                onClick={() => setDeclined(false)}
              >
                返回重新确认
              </Button>
            </div>
          </>
        ) : (
          <>
            <p id="age-gate-desc" className="mt-3 text-[14px] leading-relaxed text-mut">
              本网站可能包含仅适合成年人观看的影视短剧内容，严格禁止未成年人浏览或使用。继续访问即表示您确认自己已年满 18 周岁，并同意自行承担浏览责任。
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button
                variant="primary"
                className="min-h-11 flex-1 rounded-(--r-ctl) font-semibold"
                onClick={confirm}
              >
                我已满 18 周岁，继续访问
              </Button>
              <Button
                className="min-h-11 flex-1 rounded-(--r-ctl) bg-s3 text-on/85"
                onClick={() => setDeclined(true)}
              >
                未满 18 周岁，离开
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
