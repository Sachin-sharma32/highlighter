import { useQuery } from "convex/react";
import { StickyNote } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import type { Id } from "../../../convex/_generated/dataModel";

type ListHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  title: string;
  text: string;
  color: string;
  note?: string;
  createdAt: number;
};

const COLOR_BAR: Record<string, string> = {
  amber: "var(--hl-amber)",
  rose: "var(--hl-rose)",
  sage: "var(--hl-sage)",
  sky: "var(--hl-sky)",
  violet: "var(--hl-violet)",
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function collectionLabel(id: Id<"collections"> | "inbox" | "all" | "notes" | "review") {
  if (id === "inbox") return "Inbox";
  if (id === "all") return "All highlights";
  if (id === "notes") return "With notes";
  if (id === "review") return "Review";
  return null;
}

export function HighlightList() {
  const { activeCollectionId, selectedHighlightId, setSelectedHighlight, searchQuery } = useAppStore();

  const isSpecial = ["inbox", "all", "notes", "review"].includes(activeCollectionId as string);

  const highlights = (useQuery(api.highlights.list, {
    collectionId: isSpecial ? undefined : (activeCollectionId as Id<"collections">),
    filter: activeCollectionId === "notes" ? "notes" : activeCollectionId === "review" ? undefined : undefined,
    search: searchQuery || undefined,
  }) ?? []) as ListHighlight[];

  const filtered = activeCollectionId === "inbox"
    ? highlights.filter((h: ListHighlight) => !h.collectionId)
    : highlights;

  const title = collectionLabel(activeCollectionId) ?? "Collection";

  return (
    <div
      className="flex flex-col overflow-hidden"
      data-testid="highlight-list"
      style={{ width: 360, borderRight: "1px solid var(--rule)", background: "var(--paper)" }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-baseline justify-between mb-1">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>
            {title}
          </h2>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{filtered.length}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto noscroll">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <p style={{ fontSize: 13, color: "var(--ink-4)" }}>No highlights yet.</p>
            <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
              {activeCollectionId === "inbox"
                ? "Highlights you save with the extension will appear here."
                : "Select text on any page with the extension to add highlights."}
            </p>
          </div>
        ) : (
          filtered.map((h: ListHighlight) => (
            <button
              key={h._id}
              onClick={() => setSelectedHighlight(h._id)}
              data-testid="highlight-row"
              data-highlight-id={h._id}
              className="flex gap-2.5 w-full text-left transition-colors"
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--rule)",
                borderLeft: h._id === selectedHighlightId ? "2px solid var(--accent-color)" : "2px solid transparent",
                background: h._id === selectedHighlightId ? "var(--paper-2)" : "transparent",
              }}
            >
              <div style={{ width: 3, borderRadius: 2, background: COLOR_BAR[h.color] ?? COLOR_BAR.amber, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2 mb-1">
                  <div className="text-xs truncate" style={{ color: "var(--ink-3)" }}>{h.title}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", flexShrink: 0 }}>{timeAgo(h.createdAt)}</div>
                </div>
                <p
                  data-testid="highlight-row-text"
                  className="text-sm leading-snug"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--ink)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }}
                >
                  {h.text}
                </p>
                {h.note && (
                  <div className="flex items-center gap-1 mt-1" style={{ color: "var(--ink-4)" }}>
                    <StickyNote size={10} />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
