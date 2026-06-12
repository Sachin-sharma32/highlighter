import { useQuery } from "convex/react";
import { Zap } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";

export function UsageBanner() {
  const usage = useQuery(api.billing.getUsage);
  const { setPricingModalOpen } = useAppStore();

  if (!usage || usage.plan === "premium") return null;

  const used = usage.units ?? usage.count;
  const pct = Math.min(100, Math.round((used / usage.limit) * 100));
  const isHigh = pct >= 80;

  return (
    <div
      className={`flex h-[40px] shrink-0 items-center gap-4 border-b border-rule px-6 ${
        isHigh
          ? "bg-[color-mix(in_oklab,var(--paper-2),oklch(60%_0.2_20)_10%)]"
          : "bg-paper-2"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.08em] ${
            isHigh ? "text-hl-rose-ink" : "text-ink-4"
          }`}
        >
          {used} / {usage.limit} units used
        </span>
        <div className="h-[5px] max-w-[180px] flex-1 overflow-hidden rounded-full bg-rule">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${
              isHigh ? "bg-hl-rose-ink" : "bg-hl-sage-ink"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`font-mono text-[10px] tabular-nums ${isHigh ? "text-hl-rose-ink" : "text-ink-4"}`}
        >
          {pct}%
        </span>
      </div>

      <button
        onClick={() => setPricingModalOpen(true)}
        className="flex h-7 items-center gap-1.5 rounded-full bg-accent-2 px-3.5 text-xs font-medium text-paper shadow-paper-1 transition-all duration-150 ease-out hover:brightness-110 hover:shadow-paper-2 active:scale-[0.98]"
      >
        <Zap size={12} />
        Upgrade to Premium
      </button>
    </div>
  );
}
