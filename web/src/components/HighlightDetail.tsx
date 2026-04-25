import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { ChevronLeft, ChevronRight, Copy, Share2, Link, MoreHorizontal, Trash2, Folder, Scissors } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { TagEditor } from "@/components/TagEditor";
import { Textarea } from "@/components/ui/textarea";
import { formatClipTime, youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/youtube";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = typeof COLORS[number];

type DetailHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  title: string;
  author?: string;
  url: string;
  text: string;
  color: HighlightColor;
  note?: string;
  tags: string[];
  sourceType?: "web" | "youtube";
  youtubeVideoId?: string;
  clipStart?: number;
  clipEnd?: number;
  youtubeChannelTitle?: string;
};

type ListHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  tags: string[];
};

type Collection = {
  _id: Id<"collections">;
  name: string;
};

const HL_COLORS: Record<HighlightColor, string> = {
  amber: "var(--hl-amber)",
  rose: "var(--hl-rose)",
  sage: "var(--hl-sage)",
  sky: "var(--hl-sky)",
  violet: "var(--hl-violet)",
};

function IconBtn({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center rounded-md transition-colors"
      style={{
        width: 28,
        height: 28,
        color: disabled ? "var(--ink-4)" : "var(--ink-3)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function NoteEditor({
  highlightId,
  initialNote,
  onSave,
}: {
  highlightId: Id<"highlights">;
  initialNote: string;
  onSave: (args: { id: Id<"highlights">; note: string }) => Promise<unknown>;
}) {
  const [note, setNote] = useState(initialNote);

  async function handleBlur() {
    await onSave({ id: highlightId, note });
    toast.success("Note saved");
  }

  return (
    <Textarea
      data-testid="highlight-note-input"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => void handleBlur()}
      placeholder="Add a note…"
      rows={4}
      style={{
        padding: "14px 16px",
        border: "1px solid var(--rule)",
        borderLeft: "2px solid var(--accent-color)",
        borderRadius: 8,
        background: "var(--paper-2)",
        fontSize: 14,
        lineHeight: 1.55,
        color: "var(--ink-2)",
        fontFamily: "var(--font-mono)",
        resize: "vertical",
      }}
    />
  );
}

function isYouTubeClip(highlight: DetailHighlight) {
  return (
    highlight.sourceType === "youtube" &&
    Boolean(highlight.youtubeVideoId) &&
    highlight.clipStart !== undefined &&
    highlight.clipEnd !== undefined
  );
}

function highlightDisplayText(highlight: DetailHighlight) {
  if (isYouTubeClip(highlight)) {
    return `YouTube clip ${formatClipTime(highlight.clipStart)}-${formatClipTime(highlight.clipEnd)}`;
  }
  return highlight.text;
}

function sourceUrl(highlight: DetailHighlight) {
  if (isYouTubeClip(highlight)) {
    return youtubeWatchUrl(highlight.youtubeVideoId!, highlight.clipStart);
  }
  return highlight.url;
}

function YouTubeClipPlayer({ highlight }: { highlight: DetailHighlight }) {
  if (!isYouTubeClip(highlight)) return null;
  const watchUrl = sourceUrl(highlight);

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-rule bg-paper-2">
      <div className="aspect-video w-full bg-black">
        <iframe
          title={highlightDisplayText(highlight)}
          src={youtubeEmbedUrl(highlight.youtubeVideoId!, highlight.clipStart!, highlight.clipEnd!)}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
            <Scissors size={12} />
            {formatClipTime(highlight.clipStart)}-{formatClipTime(highlight.clipEnd)}
          </div>
          {highlight.youtubeChannelTitle && (
            <div className="mt-1 truncate text-xs text-ink-4">
              {highlight.youtubeChannelTitle}
            </div>
          )}
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md border border-rule bg-paper px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
        >
          Open on YouTube
        </a>
      </div>
    </div>
  );
}

export function HighlightDetail() {
  const { activeCollectionId, activeTag, selectedHighlightId, setActiveTag, setSelectedHighlight, searchQuery, setCommandPaletteOpen } = useAppStore();
  const isSpecial = ["inbox", "all", "notes", "review"].includes(activeCollectionId as string);
  const rawNavigationHighlights = useQuery(api.highlights.list, {
    collectionId: isSpecial ? undefined : (activeCollectionId as Id<"collections">),
    filter: activeCollectionId === "notes" ? "notes" : undefined,
    search: searchQuery || undefined,
  });
  const navigationHighlights = useMemo(
    () => (rawNavigationHighlights ?? []) as ListHighlight[],
    [rawNavigationHighlights],
  );
  const collections = (useQuery(api.collections.list) ?? []) as Collection[];
  const highlight = useQuery(
    api.highlights.byId,
    selectedHighlightId ? { id: selectedHighlightId } : "skip"
  ) as DetailHighlight | null | undefined;
  const setNote = useMutation(api.highlights.setNote);
  const setColor = useMutation(api.highlights.setColor);
  const update = useMutation(api.highlights.update);
  const remove = useMutation(api.highlights.remove);

  const visibleHighlightIds = useMemo(() => {
    const visible = activeTag
      ? navigationHighlights.filter((h) => h.tags.includes(activeTag))
      : activeCollectionId === "inbox"
        ? navigationHighlights.filter((h) => !h.collectionId)
        : navigationHighlights;
    return visible.map((h) => h._id);
  }, [activeCollectionId, activeTag, navigationHighlights]);

  const currentIndex = selectedHighlightId
    ? visibleHighlightIds.findIndex((id) => id === selectedHighlightId)
    : -1;
  const previousHighlightId = currentIndex > 0 ? visibleHighlightIds[currentIndex - 1] : null;
  const nextHighlightId = currentIndex >= 0 && currentIndex < visibleHighlightIds.length - 1
    ? visibleHighlightIds[currentIndex + 1]
    : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (!highlight) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      const colorIndex = Number(event.key) - 1;
      if (colorIndex >= 0 && colorIndex < COLORS.length) {
        event.preventDefault();
        void setColor({ id: highlight._id, color: COLORS[colorIndex] });
      }
      if (event.key.toLowerCase() === "j" && nextHighlightId) {
        event.preventDefault();
        setSelectedHighlight(nextHighlightId);
      }
      if (event.key.toLowerCase() === "k" && previousHighlightId) {
        event.preventDefault();
        setSelectedHighlight(previousHighlightId);
      }
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        void navigator.clipboard.writeText(highlightDisplayText(highlight));
        toast.success("Copied to clipboard");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [highlight, nextHighlightId, previousHighlightId, setColor, setCommandPaletteOpen, setSelectedHighlight]);

  if (!selectedHighlightId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p data-testid="highlight-detail-empty" style={{ fontSize: 13, color: "var(--ink-4)" }}>Select a highlight to read it here</p>
      </div>
    );
  }

  if (!highlight) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p data-testid="highlight-detail-loading" style={{ fontSize: 13, color: "var(--ink-4)" }}>Loading…</p>
      </div>
    );
  }

  async function handleColorChange(color: HighlightColor) {
    if (!highlight) return;
    await setColor({ id: highlight._id, color });
  }

  async function handleAddTag(tag: string) {
    if (!highlight || highlight.tags.includes(tag)) return;
    await update({ id: highlight._id, tags: [...highlight.tags, tag] });
  }

  async function handleRemoveTag(tag: string) {
    if (!highlight) return;
    await update({ id: highlight._id, tags: highlight.tags.filter((t: string) => t !== tag) });
  }

  async function handleCollectionChange(value: string) {
    if (!highlight) return;
    await update({
      id: highlight._id,
      collectionId: value === "inbox" ? undefined : (value as Id<"collections">),
    });
    toast.success(value === "inbox" ? "Moved to inbox" : "Added to collection");
  }

  async function handleDelete() {
    if (!highlight) return;
    await remove({ id: highlight._id });
    setSelectedHighlight(null);
    toast.success("Highlight deleted");
  }

  function handleCopy() {
    void navigator.clipboard.writeText(highlightDisplayText(highlight!));
    toast.success("Copied to clipboard");
  }

  async function handleShare() {
    if (!highlight) return;
    const url = sourceUrl(highlight);
    const shareText = `"${highlightDisplayText(highlight)}"\n\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: highlight.title || "Marginalia highlight",
          text: shareText,
          url,
        });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(shareText);
    toast.success("Share text copied");
  }

  async function handleCopyLink() {
    if (!highlight) return;
    await navigator.clipboard.writeText(sourceUrl(highlight));
    toast.success("Source link copied");
  }

  const hlClass = `h ${highlight.color !== "amber" ? highlight.color : ""}`.trim();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="highlight-detail" style={{ background: "var(--paper)" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-5 shrink-0" style={{ height: 44, borderBottom: "1px solid var(--rule)" }}>
        <IconBtn
          onClick={() => previousHighlightId && setSelectedHighlight(previousHighlightId)}
          disabled={!previousHighlightId}
        >
          <ChevronLeft size={13} />
        </IconBtn>
        <IconBtn
          onClick={() => nextHighlightId && setSelectedHighlight(nextHighlightId)}
          disabled={!nextHighlightId}
        >
          <ChevronRight size={13} />
        </IconBtn>
        <div className="flex-1" />
        <IconBtn onClick={handleCopy}><Copy size={13} /></IconBtn>
        <IconBtn onClick={() => void handleShare()}><Share2 size={13} /></IconBtn>
        <IconBtn onClick={() => void handleCopyLink()}><Link size={13} /></IconBtn>
        <button
          onClick={() => void handleDelete()}
          title="Delete highlight"
          className="flex items-center justify-center rounded-md transition-colors"
          style={{ width: 28, height: 28, color: "var(--ink-4)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(60% 0.2 25)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-4)"; }}
        >
          <Trash2 size={13} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-md" style={{ width: 28, height: 28, color: "var(--ink-3)" }}>
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => void handleDelete()}
              className="gap-2 text-xs cursor-pointer text-red-600"
            >
              <Trash2 size={12} /> Delete highlight
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto noscroll px-14 py-10">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {/* Source metadata */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            {highlight.title}{highlight.author ? `  ·  ${highlight.author}` : ""}
            <a
              href={sourceUrl(highlight)}
              target="_blank"
              rel="noreferrer"
              className="ml-2 hover:underline"
              style={{ color: "var(--accent-color)" }}
            >
              ↗
            </a>
          </div>

          <YouTubeClipPlayer highlight={highlight} />

          {/* Highlight text as blockquote */}
          <blockquote
            data-testid="highlight-detail-quote"
            style={{
              margin: 0,
              padding: "28px 0",
              fontFamily: "var(--font-quote)",
              fontSize: 24,
              lineHeight: 1.38,
              letterSpacing: "-0.015em",
              color: "var(--ink)",
              borderTop: "1px solid var(--rule)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <span className={hlClass}>{highlightDisplayText(highlight)}</span>
          </blockquote>

          {/* Color swatches */}
          <div className="flex gap-2 mt-5 items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => void handleColorChange(c)}
                data-testid={`highlight-color-${c}`}
                className="rounded transition-transform hover:scale-110"
                title={c}
                style={{
                  width: 20,
                  height: 20,
                  background: HL_COLORS[c],
                  border: highlight.color === c ? "2px solid var(--ink)" : "2px solid transparent",
                  borderRadius: 4,
                }}
              />
            ))}
          </div>

          {/* Tags */}
          <div className="mt-5">
            <TagEditor
              tags={highlight.tags}
              activeTag={activeTag}
              onSelectTag={setActiveTag}
              onAddTag={(tag) => void handleAddTag(tag)}
              onRemoveTag={(tag) => void handleRemoveTag(tag)}
            />
          </div>

          <div className="mt-5 rounded-lg border p-3" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-4)" }}>
              <Folder size={12} /> Collection
            </div>
            <Select
              value={highlight.collectionId ?? "inbox"}
              onValueChange={(value) => void handleCollectionChange(value)}
            >
              <SelectTrigger className="h-8 bg-paper text-xs">
                <SelectValue placeholder="Choose collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection._id} value={collection._id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="mt-7">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Your note
            </div>
            <NoteEditor
              key={highlight._id}
              highlightId={highlight._id}
              initialNote={highlight.note ?? ""}
              onSave={setNote}
            />
          </div>

          {/* Related in your library — placeholder */}
          <div className="mt-7 p-4 rounded-lg" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent-2)" }}>
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.8 7 18.2l1.9-5.8L4 8.8h6.1L12 3z"/>
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Related in your library
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
              AI-powered related highlights coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
