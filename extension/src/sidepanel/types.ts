export const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
export type HighlightColor = (typeof COLORS)[number];

export const HL_BG_CLASS: Record<HighlightColor, string> = {
  amber: "bg-hl-amber",
  rose: "bg-hl-rose",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
  violet: "bg-hl-violet",
};

export interface Highlight {
  _id: string;
  text: string;
  color: HighlightColor;
  note?: string;
  url: string;
  title: string;
  createdAt: number;
  collectionId?: string;
  sourceType?: "web" | "youtube";
  youtubeVideoId?: string;
  clipStart?: number;
  clipEnd?: number;
  youtubeChannelTitle?: string;
}

export interface Collection {
  _id: string;
  name: string;
}

export type Tab = "highlights" | "collections" | "all" | "stats";
