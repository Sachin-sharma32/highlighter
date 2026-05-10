import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { TagEditor } from "@/components/TagEditor";
import { DetailToolbar } from "./DetailToolbar";
import { SourceMetadata } from "./SourceMetadata";
import { YouTubeClipPlayer } from "./YouTubeClipPlayer";
import { ColorSwatches } from "./ColorSwatches";
import { CollectionPicker } from "./CollectionPicker";
import { NoteEditor } from "./NoteEditor";
import { RelatedSection } from "./RelatedSection";
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
  const isSpecial = ["inbox", "all", "notes", "review"].includes(
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
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--paper)" }}
      >
        <p
          data-testid="highlight-detail-empty"
          style={{ fontSize: 13, color: "var(--ink-4)" }}
        >
          Select a highlight to read it here
        </p>
      </div>
    );
  }

  if (!highlight) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--paper)" }}
      >
        <p
          data-testid="highlight-detail-loading"
          style={{ fontSize: 13, color: "var(--ink-4)" }}
        >
          Loading…
        </p>
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
      className="flex-1 flex flex-col overflow-hidden"
      data-testid="highlight-detail"
      style={{ background: "var(--paper)" }}
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
        onDelete={() => void handleDelete()}
      />

      <div className="flex-1 overflow-y-auto noscroll px-14 py-10">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <SourceMetadata highlight={highlight} />

          <YouTubeClipPlayer highlight={highlight} />

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

          <ColorSwatches
            current={highlight.color}
            onChange={(color) => void handleColorChange(color)}
          />

          <div className="mt-5">
            <TagEditor
              tags={highlight.tags}
              activeTag={activeTag}
              onSelectTag={setActiveTag}
              onAddTag={(tag) => void handleAddTag(tag)}
              onRemoveTag={(tag) => void handleRemoveTag(tag)}
            />
          </div>

          <CollectionPicker
            value={highlight.collectionId}
            collections={collections}
            onChange={(value) => void handleCollectionChange(value)}
          />

          <div className="mt-7">
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
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
