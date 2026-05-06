import { hostnameOf } from "../helpers";
import type { Highlight } from "../types";
import { EmptyState } from "./EmptyState";
import { HighlightRow } from "./HighlightRow";

interface AllPagesTabProps {
  highlights: Highlight[];
  onRowClick: (h: Highlight) => void;
  onDelete: (h: Highlight) => void;
}

export function AllPagesTab({
  highlights,
  onRowClick,
  onDelete,
}: AllPagesTabProps) {
  if (!highlights.length) {
    return (
      <EmptyState
        text="No highlights saved yet."
        sub="Highlights you save across the web will appear here."
      />
    );
  }

  const groups: { url: string; title: string; items: Highlight[] }[] = [];
  const indexByUrl = new Map<string, number>();
  for (const h of highlights) {
    const existingIndex = indexByUrl.get(h.url);
    if (existingIndex == null) {
      indexByUrl.set(h.url, groups.length);
      groups.push({ url: h.url, title: h.title, items: [h] });
    } else {
      groups[existingIndex].items.push(h);
    }
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.url} className="border-b border-rule">
          <div className="px-4 pb-1.5 pt-3">
            <div className="truncate font-display text-[12px] font-medium text-ink-2">
              {group.title || hostnameOf(group.url)}
            </div>
            <div className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4">
              {hostnameOf(group.url)} · {group.items.length} highlight
              {group.items.length !== 1 ? "s" : ""}
            </div>
          </div>
          {group.items.map((highlight) => (
            <HighlightRow
              key={highlight._id}
              highlight={highlight}
              variant="compact"
              onClick={onRowClick}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
