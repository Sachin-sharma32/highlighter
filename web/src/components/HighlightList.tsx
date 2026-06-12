import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Scissors, StickyNote, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatClipTime } from "@/lib/youtube";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type ListHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  title: string;
  text: string;
  color: string;
  note?: string;
  tags: string[];
  url: string;
  createdAt: number;
  sourceType?: "web" | "youtube";
  youtubeVideoId?: string;
  clipStart?: number;
  clipEnd?: number;
};

const COLOR_BAR: Record<string, string> = {
  amber: "bg-hl-amber",
  rose: "bg-hl-rose",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
  violet: "bg-hl-violet",
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

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

function collectionLabel(
  id: Id<"collections"> | "inbox" | "all" | "notes" | "custom-notes",
) {
  if (id === "inbox") return "Inbox";
  if (id === "all") return "All highlights";
  if (id === "notes") return "With notes";
  if (id === "custom-notes") return "Notes";
  return null;
}

function highlightDisplayText(highlight: ListHighlight) {
  if (highlight.sourceType === "youtube") {
    if (highlight.clipStart !== undefined && highlight.clipEnd !== undefined) {
      return `YouTube clip ${formatClipTime(highlight.clipStart)}-${formatClipTime(highlight.clipEnd)}`;
    }
    return "YouTube clip";
  }
  return highlight.text;
}

export function HighlightList() {
  const {
    activeCollectionId,
    activeTag,
    activeDomain,
    selectedHighlightId,
    setSelectedHighlight,
    searchQuery,
  } = useAppStore();

  const isSpecial = ["inbox", "all", "notes"].includes(
    activeCollectionId as string,
  );

  const rawHighlights = useQuery(api.highlights.list, {
    collectionId: isSpecial
      ? undefined
      : (activeCollectionId as Id<"collections">),
    filter: activeCollectionId === "notes" ? "notes" : undefined,
    search: searchQuery || undefined,
  });
  const isLoading = rawHighlights === undefined;
  const highlights = (rawHighlights ?? []) as ListHighlight[];

  const remove = useMutation(api.highlights.remove);
  const [pendingDeleteId, setPendingDeleteId] =
    useState<Id<"highlights"> | null>(null);

  let filtered = activeTag
    ? highlights.filter((h) => h.tags.includes(activeTag))
    : activeCollectionId === "inbox"
      ? highlights.filter((h) => !h.collectionId)
      : highlights;

  // Apply domain filter
  if (activeDomain) {
    filtered = filtered.filter((h) => hostnameOf(h.url) === activeDomain);
  }

  const title = activeDomain
    ? activeDomain
    : activeTag
      ? `#${activeTag}`
      : (collectionLabel(activeCollectionId) ?? "Collection");

  async function handleDelete(id: Id<"highlights">) {
    try {
      await remove({ id });
      if (selectedHighlightId === id) {
        setSelectedHighlight(null);
      }
      toast.success("Highlight deleted");
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t delete that highlight. Please try again.",
        ),
      );
    }
  }

  return (
    <div
      className="flex w-[360px] flex-col overflow-hidden border-r border-rule bg-paper"
      data-testid="highlight-list"
    >
      {/* Header */}
      <div className="border-b border-rule px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[22px] font-medium tracking-tight text-ink">
            {title}
          </h2>
          <span className="rounded-full border border-rule bg-paper-2 px-2 py-px font-mono text-[10px] tabular-nums text-ink-4">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-px p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 py-3">
                <div className="flex justify-between gap-2">
                  <div className="skeleton h-2.5 w-2/5" />
                  <div className="skeleton h-2.5 w-8" />
                </div>
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full animate-fade-up flex-col items-center justify-center gap-5 px-8 text-center">
            {/* A page in miniature, with one marked line */}
            <div
              aria-hidden
              className="w-36 space-y-2.5 rounded-lg border border-rule bg-paper-2 p-4 shadow-paper-1"
            >
              <div className="h-1.5 w-full rounded-full bg-paper-3" />
              <div className="h-1.5 w-4/5 rounded-full bg-paper-3" />
              <div className="h-1.5 w-11/12 rounded-full bg-hl-amber" />
              <div className="h-1.5 w-3/5 rounded-full bg-paper-3" />
            </div>
            <div>
              <p className="m-0 mb-1 font-display text-[15px] text-ink-2">
                Nothing marked yet
              </p>
              <p className="m-0 text-xs leading-relaxed text-ink-4">
                {activeCollectionId === "inbox"
                  ? "Highlights you save with the extension will land here."
                  : "Select text on any page with the extension to add highlights."}
              </p>
            </div>
          </div>
        ) : (
          <div className="stagger-children">
            {filtered.map((h) => (
              <div
                key={h._id}
                data-testid="highlight-row"
                data-highlight-id={h._id}
                className={`group relative flex w-full gap-2.5 border-b border-rule text-left transition-colors duration-150 ${
                  h._id === selectedHighlightId
                    ? "bg-paper-2"
                    : "hover:bg-[color-mix(in_oklab,var(--paper),var(--paper-2)_60%)]"
                }`}
              >
                {/* Accent rail for the selected row */}
                <span
                  className={`absolute inset-y-0 left-0 w-[2px] bg-accent transition-opacity duration-150 ${
                    h._id === selectedHighlightId ? "opacity-100" : "opacity-0"
                  }`}
                />
                <button
                  onClick={() => setSelectedHighlight(h._id)}
                  className="flex min-w-0 flex-1 gap-2.5 px-4 py-3 text-left"
                >
                  <div
                    className={`w-[3px] shrink-0 rounded-full ${COLOR_BAR[h.color] ?? COLOR_BAR.amber}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-3">
                        {h.sourceType === "youtube" && (
                          <Scissors
                            size={11}
                            className="shrink-0 text-accent"
                          />
                        )}
                        <span className="truncate">{h.title}</span>
                      </div>
                      <div className="shrink-0 font-mono text-[10px] tabular-nums text-ink-4">
                        {timeAgo(h.createdAt)}
                      </div>
                    </div>
                    <p
                      data-testid="highlight-row-text"
                      className="overflow-hidden font-display text-sm leading-snug text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
                    >
                      {highlightDisplayText(h)}
                    </p>
                    {h.note && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-4">
                        <StickyNote size={10} />
                        <span>note</span>
                      </div>
                    )}
                  </div>
                </button>
                {/* Quick delete button */}
                <button
                  onClick={() => setPendingDeleteId(h._id)}
                  title="Delete highlight"
                  className="flex shrink-0 items-center justify-center rounded p-1 pr-3 text-ink-4 opacity-0 transition-all duration-150 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDeleteDialog
        open={Boolean(pendingDeleteId)}
        title="Delete highlight?"
        description="This highlight and its note will be permanently deleted."
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          await handleDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
