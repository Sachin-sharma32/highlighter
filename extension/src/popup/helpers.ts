import { formatClipTime } from "@/lib/youtube";
import type { Highlight, Scope } from "./types";

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function clipLabel(start?: number, end?: number) {
  if (start === undefined || end === undefined) return "YouTube clip";
  return `YouTube clip ${formatClipTime(start)}-${formatClipTime(end)}`;
}

export function highlightDisplayText(highlight: Highlight) {
  if (highlight.sourceType === "youtube") {
    return clipLabel(highlight.clipStart, highlight.clipEnd);
  }
  return highlight.text;
}

export function buildMarkdown(
  highlights: Highlight[],
  scope: Scope,
  pageTitle: string,
) {
  const title = scope === "page" ? pageTitle : "Marginalia Highlights";
  const body = highlights
    .map((h) => {
      const source =
        scope === "all"
          ? `\n\nSource: ${h.title || hostnameOf(h.url)} (${h.url})`
          : "";
      return `> ${highlightDisplayText(h)}${h.note ? `\n\n${h.note}` : ""}${source}`;
    })
    .join("\n\n---\n\n");
  return { title, content: `# ${title || "Highlights"}\n\n${body}` };
}

export function downloadMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${
    (title || "marginalia-highlights")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "marginalia-highlights"
  }.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
