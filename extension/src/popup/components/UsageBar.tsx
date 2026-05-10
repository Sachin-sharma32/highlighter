import type { UsageData } from "../types";

interface UsageBarProps {
  usage: UsageData;
}

export function UsageBar({ usage }: UsageBarProps) {
  const ratio = usage.count / usage.limit;
  const percent = Math.min(100, ratio * 100);
  const isHigh = ratio > 0.8;

  return (
    <div className="border-b border-rule px-4 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-4">
          {usage.count} / {usage.limit} highlights used
        </span>
        <span className="font-mono text-[10px] text-ink-4">
          {Math.round(ratio * 100)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-rule">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
