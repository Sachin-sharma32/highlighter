import { useQuery } from "convex/react";
import { Zap } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";

export function UsageBanner() {
  const usage = useQuery(api.billing.getUsage);
  const { setPricingModalOpen } = useAppStore();

  if (!usage || usage.plan === "premium") return null;

  const pct = Math.min(100, Math.round((usage.count / usage.limit) * 100));
  const isHigh = pct >= 80;

  return (
    <div
      className={`flex h-[42px] shrink-0 items-center gap-4 border-b border-rule px-6 ${
        isHigh ? "bg-red-50" : "bg-paper-2"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.06em] ${
            isHigh ? "text-red-600" : "text-ink-4"
          }`}
        >
          {usage.count} / {usage.limit} highlights
        </span>
        <div className="h-1.5 max-w-[200px] flex-1 overflow-hidden rounded-full bg-rule">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: isHigh
                ? "oklch(65% 0.2 25)"
                : "oklch(70% 0.14 145)",
            }}
          />
        </div>
        <span
          className={`font-mono text-[10px] ${isHigh ? "text-red-600" : "text-ink-4"}`}
        >
          {pct}%
        </span>
      </div>

      <button
        onClick={() => setPricingModalOpen(true)}
        className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 px-3.5 text-xs font-medium text-white shadow-md transition-all hover:scale-[1.02]"
      >
        <Zap size={12} />
        Upgrade to Premium
      </button>
    </div>
  );
}
