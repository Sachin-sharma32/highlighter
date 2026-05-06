import { stripMarginaliaTarget, withMarginaliaTarget } from "@/lib/urls";
import { formatClipTime, youtubeWatchUrl } from "@/lib/youtube";
import type { Highlight } from "./types";

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export async function copyHighlightText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
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

export async function navigateToHighlight(
  highlight: Highlight,
  currentUrl: string,
  currentTabId: number | null,
) {
  if (highlight.sourceType === "youtube" && highlight.youtubeVideoId) {
    await chrome.tabs.create({
      url: youtubeWatchUrl(highlight.youtubeVideoId, highlight.clipStart),
    });
    return;
  }

  if (
    stripMarginaliaTarget(highlight.url) === currentUrl &&
    currentTabId != null
  ) {
    try {
      await chrome.tabs.sendMessage(currentTabId, {
        type: "SCROLL_TO_HIGHLIGHT",
        payload: { id: highlight._id },
      });
    } catch {
      /* content script not loaded — ignore */
    }
    return;
  }
  await chrome.tabs.create({
    url: withMarginaliaTarget(highlight.url, highlight._id),
  });
}
