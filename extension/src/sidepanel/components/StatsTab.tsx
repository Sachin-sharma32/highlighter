import { Globe } from "lucide-react";
import {
  HL_BG_CLASS,
  type Highlight,
  type HighlightColor,
  type Tab,
} from "../types";

const SECTION_CARD_CLASS = "rounded border border-rule bg-paper-2 p-[14px]";

interface StatsTabProps {
  highlights: Highlight[];
  allHighlights: Highlight[];
  colorCounts: { color: HighlightColor; count: number }[];
  domains: { domain: string; count: number }[];
  statsDomain: string | null;
  setStatsDomain: (d: string | null) => void;
  setActiveTab: (t: Tab) => void;
  setDomainFilter: (f: string) => void;
}

export function StatsTab({
  highlights,
  colorCounts,
  domains,
  statsDomain,
  setStatsDomain,
  setDomainFilter,
}: StatsTabProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
            {statsDomain ? statsDomain : "Overall stats"}
          </span>
          {statsDomain && (
            <button
              onClick={() => setStatsDomain(null)}
              className="text-[10px] font-mono text-accent"
            >
              Show all
            </button>
          )}
        </div>
        {[
          ["Highlights", highlights.length],
          [
            "With notes",
            highlights.filter((highlight) => highlight.note).length,
          ],
          [
            "Unique colours",
            colorCounts.filter((entry) => entry.count > 0).length,
          ],
          ...(statsDomain
            ? []
            : [["Domains", domains.length] as [string, number]]),
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="flex justify-between border-b border-rule py-[5px] text-[13px] last:border-b-0"
          >
            <span className="text-ink-3">{label}</span>
            <span className="font-display font-medium text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
          Colours
        </div>
        {colorCounts.map(({ color, count }) => (
          <div key={color} className="flex items-center gap-2 py-1">
            <div className={`size-2.5 rounded-sm ${HL_BG_CLASS[color]}`} />
            <span className="flex-1 text-xs capitalize text-ink-2">
              {color}
            </span>
            <div className="flex flex-[2] gap-px overflow-hidden rounded-full bg-rule p-px">
              {count > 0 ? (
                Array.from({ length: count }).map((_, index) => (
                  <div
                    key={`${color}-${index}`}
                    className={`h-1 flex-1 rounded-full ${HL_BG_CLASS[color]}`}
                  />
                ))
              ) : (
                <div className="h-1 flex-1 rounded-full bg-transparent" />
              )}
            </div>
            <span className="w-4 text-right font-mono text-[10px] text-ink-4">
              {count}
            </span>
          </div>
        ))}
      </div>

      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
          Domains
        </div>
        {domains.length === 0 ? (
          <p className="text-xs text-ink-4">No domains yet.</p>
        ) : (
          domains.map(({ domain, count }) => (
            <button
              key={domain}
              onClick={() => {
                setStatsDomain(domain);
                setDomainFilter(domain);
              }}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                statsDomain === domain
                  ? "bg-paper text-ink"
                  : "text-ink-3 hover:bg-paper hover:text-ink-2"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Globe size={11} className="text-ink-4 shrink-0" />
                {domain}
              </span>
              <span className="font-mono text-[10px] text-ink-4">{count}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
