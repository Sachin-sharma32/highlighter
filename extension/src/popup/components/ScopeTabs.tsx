import type { Scope } from "../types";

interface ScopeTabsProps {
  scope: Scope;
  pageCount: number;
  allCount: number;
  onChange: (scope: Scope) => void;
}

const TABS = [
  { key: "page", label: "This page" },
  { key: "all", label: "All pages" },
] as const;

export function ScopeTabs({
  scope,
  pageCount,
  allCount,
  onChange,
}: ScopeTabsProps) {
  const counts: Record<Scope, number> = { page: pageCount, all: allCount };

  return (
    <div className="flex border-b border-rule">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`h-9 flex-1 border-b-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] transition-colors ${
            scope === tab.key
              ? "border-accent text-ink"
              : "border-transparent text-ink-4 hover:text-ink-2"
          }`}
        >
          {tab.label}{" "}
          <span className="ml-0.5 text-ink-4">({counts[tab.key]})</span>
        </button>
      ))}
    </div>
  );
}
