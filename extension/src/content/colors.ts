import { getCustomColors } from "./settings";

export const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
export type HighlightColor = (typeof COLORS)[number];

export const HIGHLIGHT_FILLS: Record<HighlightColor, string> = {
  amber: "#fde68a",
  rose: "#fecdd3",
  sage: "#bbf7d0",
  sky: "#bae6fd",
  violet: "#ddd6fe",
};

const CSS_VAR_PATTERN =
  /^var\(\s*--hl-(amber|rose|sage|sky|violet)(?:\s*,[^)]*)?\s*\)$/;

export function resolveHighlightFill(color: string) {
  const custom = getCustomColors().find((c) => c.id === color)?.value;
  if (!custom)
    return HIGHLIGHT_FILLS[color as HighlightColor] ?? HIGHLIGHT_FILLS.amber;

  const cssVarMatch = custom.match(CSS_VAR_PATTERN);
  if (cssVarMatch) return HIGHLIGHT_FILLS[cssVarMatch[1] as HighlightColor];

  return custom;
}

export function getAllColors(): { id: string; color: string }[] {
  const custom = getCustomColors();
  if (custom.length > 0)
    return custom.map((c) => ({ id: c.id, color: c.value }));
  return COLORS.map((c) => ({ id: c, color: HIGHLIGHT_FILLS[c] }));
}

export function resolveDefaultColor(): string {
  return getAllColors()[0]?.id ?? "amber";
}
