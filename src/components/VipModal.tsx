import { useState } from "react";
import { api, isMobile } from "../api";
import { useStore } from "../store";
import { Modal, Sheet } from "./ui";
import { Button } from "./ios/controls";
import { Loader } from "./ios/effects";
import { ICheck, IClose, ICrown } from "../icons";

// 预设 VIP 套餐
const VIP_PLANS = [
  { id: "month", name: "月度 VIP", days: 30, price: "19.90", desc: "畅享 30 天无限制高清播放", badge: "尝鲜" },
  { id: "quarter", name: "季度 VIP", days: 90, price: "49.90", desc: "畅享 90 天无限制高清播放", badge: "特惠" },
  { id: "year", name: "年度 VIP", days: 365, price: "99.00", desc: "畅享 365 天无限制高清播放", badge: "超值" },
];

export default function VipModal() {
  const { vipOpen, setVipOpen, user, setLoginOpen, toast } = useStore();
  const [selectedPlan, setSelectedPlan] = useState(VIP_PLANS[0]);
  const [loading, setLoading] = useState(false);

  if (!vipOpen) return null;

  const close = () => {
    if (loading) return;
    setVipOpen(false);
  };

  const handlePay = async () => {
    if (!user) {
      setVipOpen(false);
      setLoginOpen(true);
      return;
    }

    setLoading(true);
    try {
      // 优先从环境变量或全局配置中获取支付网关，缺省走当前域名或默认后端
      const payGateway = (import.meta as any).env?.VITE_CFPAY_URL || "/api/pay/create";
      const res = await fetch(payGateway, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          days: selectedPlan.days,
          amount: selectedPlan.price,
          subject: `HGhubX ${selectedPlan.name}`,
        }),
      });

      if (!res.ok) {
        throw new Error("创建支付订单失败，请稍后重试");
      }

      const data = await res.json();
      if (data.ok && data.payment_url) {
        toast("正在前往支付宝支付...", "info");
        await api.openUrl(data.payment_url);
        close();
      } else {
        toast(data.message || "创建支付链接失败", "info");
      }
    } catch (e: any) {
      toast(e.message || "发起支付失败，请检查网络或联系管理员", "info");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="flex flex-col gap-5 p-2">
      {/* 头部简介 */}
      <div className="flex items-center gap-3.5 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-3.5 rounded-2xl border border-amber-500/20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
          <ICrown size={26} strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[16px] font-bold text-white flex items-center gap-2">
            开通 HGhubX VIP
          </h4>
          <p className="text-[12px] text-zinc-300 mt-0.5">解锁全部视频完整观看权益 · 高清无限制</p>
        </div>
      </div>

      {/* 套餐选项 */}
      <div className="flex flex-col gap-2.5">
        <div className="text-[13px] font-medium text-zinc-400 px-1">选择会员套餐</div>
        <div className="grid grid-cols-3 gap-2.5">
          {VIP_PLANS.map((plan) => {
            const isSelected = selectedPlan.id === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10"
                    : "bg-white/5 border-white/10 hover:border-white/20 text-zinc-300"
                }`}>
                {plan.badge && (
                  <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black leading-none">
                    {plan.badge}
                  </span>
                )}
                <div className="text-[13px] font-medium mb-1">{plan.name}</div>
                <div className="flex items-baseline text-amber-400">
                  <span className="text-[12px] font-bold">¥</span>
                  <span className="text-[20px] font-bold tracking-tight">{plan.price}</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">{plan.days} 天</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 权益列表 */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2 text-[12px] text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="text-amber-400"><ICheck size={14} strokeWidth={2.5} /></span>
          <span>无限时长完整播放，无试看 60 秒限制</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400"><ICheck size={14} strokeWidth={2.5} /></span>
          <span>畅享极速专线与高码率画质</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400"><ICheck size={14} strokeWidth={2.5} /></span>
          <span>尊贵专属 VIP 标识徽章</span>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex flex-col gap-2 pt-1">
        {user ? (
          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 pressable">
            {loading ? <Loader label="正在创建订单..." /> : `立即支付 ¥${selectedPlan.price} 开通`}
          </Button>
        ) : (
          <Button
            onClick={() => {
              setVipOpen(false);
              setLoginOpen(true);
            }}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-[14px] flex items-center justify-center gap-2 pressable">
            请先登录后再开通
          </Button>
        )}
        <Button
          onClick={close}
          className="w-full py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-[13px] pressable">
          暂不需要
        </Button>
      </div>
    </div>
  );

  return isMobile ? (
    <Sheet open={vipOpen} onClose={close} label="开通 VIP">
      {content}
    </Sheet>
  ) : (
    <Modal open={vipOpen} onClose={close} label="开通 VIP" width={420}>
      {content}
    </Modal>
  );
}
