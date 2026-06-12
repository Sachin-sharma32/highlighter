import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { DetailToolbar } from "./DetailToolbar";
import { SourceMetadata } from "./SourceMetadata";
import { YouTubeClipPlayer } from "./YouTubeClipPlayer";
import { MetadataStrip } from "./MetadataStrip";
import { NoteEditor } from "./NoteEditor";
import { RelatedSection } from "./RelatedSection";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  COLORS,
  highlightDisplayText,
  sourceUrl,
  type Collection,
  type DetailHighlight,
  type HighlightColor,
  type ListHighlight,
} from "./lib";

export function HighlightDetail() {
  const {
    activeCollectionId,
    activeTag,
    selectedHighlightId,
    setActiveTag,
    setSelectedHighlight,
    searchQuery,
    setCommandPaletteOpen,
  } = useAppStore();
  const isSpecial = ["inbox", "all", "notes"].includes(
    activeCollectionId as string,
  );
  const rawNavigationHighlights = useQuery(api.highlights.list, {
    collectionId: isSpecial
      ? undefined
      : (activeCollectionId as Id<"collections">),
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
    selectedHighlightId ? { id: selectedHighlightId } : "skip",
  ) as DetailHighlight | null | undefined;
  const setNote = useMutation(api.highlights.setNote);
  const setColor = useMutation(api.highlights.setColor);
  const update = useMutation(api.highlights.update);
  const remove = useMutation(api.highlights.remove);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
  const previousHighlightId =
    currentIndex > 0 ? visibleHighlightIds[currentIndex - 1] : null;
  const nextHighlightId =
    currentIndex >= 0 && currentIndex < visibleHighlightIds.length - 1
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
  }, [
    highlight,
    nextHighlightId,
    previousHighlightId,
    setColor,
    setCommandPaletteOpen,
    setSelectedHighlight,
  ]);

  if (!selectedHighlightId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <div className="flex animate-fade-up flex-col items-center gap-4 text-center">
          <span
            aria-hidden
            className="font-display text-[64px] leading-none text-paper-3 select-none"
          >
            &ldquo;
          </span>
          <p
            data-testid="highlight-detail-empty"
            className="m-0 -mt-6 text-[13px] text-ink-4"
          >
            Select a highlight to read it here
          </p>
          <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-ink-4">
            <span className="flex items-center gap-1">
              <kbd>J</kbd>
              <kbd>K</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd>1</kbd>–<kbd>5</kbd> recolour
            </span>
            <span className="flex items-center gap-1">
              <kbd>C</kbd> copy
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!highlight) {
    return (
      <div
        data-testid="highlight-detail-loading"
        className="flex flex-1 flex-col bg-paper"
      >
        <div className="h-11 shrink-0 border-b border-rule" />
        <div className="flex-1 px-14 py-10">
          <div className="mx-auto max-w-[560px] space-y-6">
            <div className="skeleton h-2.5 w-1/3" />
            <div className="space-y-3 border-y border-rule py-7">
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-11/12" />
              <div className="skeleton h-5 w-2/3" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-5 w-16" />
            </div>
            <div className="skeleton h-28 w-full" />
          </div>
        </div>
      </div>
    );
  }

  async function handleColorChange(color: HighlightColor) {
    if (!highlight) return;
    try {
      await setColor({ id: highlight._id, color });
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t update the highlight color. Please try again.",
        ),
      );
    }
  }

  async function handleAddTag(tag: string) {
    if (!highlight || highlight.tags.includes(tag)) return;
    try {
      await update({ id: highlight._id, tags: [...highlight.tags, tag] });
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t add that tag. Please try again.",
        ),
      );
    }
  }

  async function handleRemoveTag(tag: string) {
    if (!highlight) return;
    try {
      await update({
        id: highlight._id,
        tags: highlight.tags.filter((t: string) => t !== tag),
      });
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t remove that tag. Please try again.",
        ),
      );
    }
  }

  async function handleCollectionChange(value: string) {
    if (!highlight) return;
    try {
      await update({
        id: highlight._id,
        collectionId:
          value === "inbox" ? undefined : (value as Id<"collections">),
      });
      toast.success(
        value === "inbox" ? "Moved to inbox" : "Added to collection",
      );
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t move that highlight. Please try again.",
        ),
      );
    }
  }

  async function handleDelete() {
    if (!highlight) return;
    try {
      await remove({ id: highlight._id });
      setSelectedHighlight(null);
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

  const hlClass =
    `h ${highlight.color !== "amber" ? highlight.color : ""}`.trim();

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden bg-paper"
      data-testid="highlight-detail"
    >
      <DetailToolbar
        hasPrevious={Boolean(previousHighlightId)}
        hasNext={Boolean(nextHighlightId)}
        onPrevious={() =>
          previousHighlightId && setSelectedHighlight(previousHighlightId)
        }
        onNext={() => nextHighlightId && setSelectedHighlight(nextHighlightId)}
        onCopy={handleCopy}
        onShare={() => void handleShare()}
        onCopyLink={() => void handleCopyLink()}
        onDelete={() => setDeleteDialogOpen(true)}
      />
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        title="Delete highlight?"
        description="This highlight and its note will be permanently deleted."
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => void handleDelete()}
      />

      <div className="noscroll flex-1 overflow-y-auto px-14 py-10">
        <div
          key={highlight._id}
          className="mx-auto max-w-[560px] animate-fade-up"
        >
          <SourceMetadata highlight={highlight} />

          <YouTubeClipPlayer highlight={highlight} />

          <blockquote
            data-testid="highlight-detail-quote"
            className="relative m-0 border-y border-rule py-7 font-display text-[25px] leading-[1.42] tracking-[-0.015em] text-ink"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -left-9 top-4 font-display text-[56px] leading-none text-paper-3 select-none"
            >
              &ldquo;
            </span>
            <span className={hlClass}>{highlightDisplayText(highlight)}</span>
          </blockquote>

          <MetadataStrip
            color={highlight.color}
            collectionId={highlight.collectionId}
            collections={collections}
            tags={highlight.tags}
            activeTag={activeTag}
            onColorChange={(color) => void handleColorChange(color)}
            onCollectionChange={(value) => void handleCollectionChange(value)}
            onSelectTag={setActiveTag}
            onAddTag={(tag) => void handleAddTag(tag)}
            onRemoveTag={(tag) => void handleRemoveTag(tag)}
          />

          <div className="mt-7">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
              Your note
            </div>
            <NoteEditor
              key={highlight._id}
              highlightId={highlight._id}
              initialNote={highlight.note ?? ""}
              onSave={setNote}
            />
          </div>

          <RelatedSection />
        </div>
      </div>
    </div>
  );
}
