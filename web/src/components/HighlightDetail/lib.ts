import { formatClipTime, youtubeWatchUrl } from "@/lib/youtube";
import type { Id } from "../../../../convex/_generated/dataModel";

export const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
export type HighlightColor = (typeof COLORS)[number];

export const HL_COLORS: Record<HighlightColor, string> = {
  amber: "var(--hl-amber)",
  rose: "var(--hl-rose)",
  sage: "var(--hl-sage)",
  sky: "var(--hl-sky)",
  violet: "var(--hl-violet)",
};

export type DetailHighlight = {
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

export type ListHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  tags: string[];
};

export type Collection = {
  _id: Id<"collections">;
  name: string;
};

export function isYouTubeClip(highlight: DetailHighlight) {
  return (
    highlight.sourceType === "youtube" &&
    Boolean(highlight.youtubeVideoId) &&
    highlight.clipStart !== undefined &&
    highlight.clipEnd !== undefined
  );
}

export function highlightDisplayText(highlight: DetailHighlight) {
  if (isYouTubeClip(highlight)) {
    return `YouTube clip ${formatClipTime(highlight.clipStart)}-${formatClipTime(highlight.clipEnd)}`;
  }
  return highlight.text;
}

export function sourceUrl(highlight: DetailHighlight) {
  if (isYouTubeClip(highlight)) {
    return youtubeWatchUrl(highlight.youtubeVideoId!, highlight.clipStart);
  }
  return highlight.url;
}
