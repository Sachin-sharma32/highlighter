import { useQuery, useMutation } from "convex/react";
import { Scissors, StickyNote, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatClipTime } from "@/lib/youtube";

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
  id: Id<"collections"> | "inbox" | "all" | "notes" | "review",
) {
  if (id === "inbox") return "Inbox";
  if (id === "all") return "All highlights";
  if (id === "notes") return "With notes";
  if (id === "review") return "Review";
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

  const isSpecial = ["inbox", "all", "notes", "review"].includes(
    activeCollectionId as string,
  );

  const highlights = (useQuery(api.highlights.list, {
    collectionId: isSpecial
      ? undefined
      : (activeCollectionId as Id<"collections">),
    filter: activeCollectionId === "notes" ? "notes" : undefined,
    search: searchQuery || undefined,
  }) ?? []) as ListHighlight[];

  const remove = useMutation(api.highlights.remove);

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
      <div className="border-b border-rule px-4 pb-2.5 pt-3.5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[22px] font-medium tracking-tight text-ink">
            {title}
          </h2>
          <span className="font-mono text-[11px] text-ink-4">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-[13px] text-ink-4">No highlights yet.</p>
            <p className="text-xs text-ink-4">
              {activeCollectionId === "inbox"
                ? "Highlights you save with the extension will appear here."
                : "Select text on any page with the extension to add highlights."}
            </p>
          </div>
        ) : (
          filtered.map((h) => (
            <div
              key={h._id}
              data-testid="highlight-row"
              data-highlight-id={h._id}
              className={`group flex w-full gap-2.5 border-b border-rule text-left transition-colors ${
                h._id === selectedHighlightId
                  ? "border-l-2 border-l-accent bg-paper-2"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              <button
                onClick={() => setSelectedHighlight(h._id)}
                className="flex min-w-0 flex-1 gap-2.5 px-4 py-3 text-left"
              >
                <div
                  className={`w-[3px] shrink-0 rounded-sm ${COLOR_BAR[h.color] ?? COLOR_BAR.amber}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-3">
                      {h.sourceType === "youtube" && (
                        <Scissors size={11} className="shrink-0 text-accent" />
                      )}
                      <span className="truncate">{h.title}</span>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] text-ink-4">
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
                    <div className="mt-1 flex items-center gap-1 text-ink-4">
                      <StickyNote size={10} />
                    </div>
                  )}
                </div>
              </button>
              {/* Quick delete button */}
              <button
                onClick={() => void handleDelete(h._id)}
                title="Delete highlight"
                className="flex shrink-0 items-center justify-center rounded p-1 pr-3 text-ink-4 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
