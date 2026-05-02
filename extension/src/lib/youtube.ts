export interface YouTubeClipContext {
  videoId: string;
  title: string;
  url: string;
  currentTime: number;
  duration?: number;
  channelTitle?: string;
}

export const DEFAULT_CLIP_WINDOW_SECONDS = 30;

export function getYouTubeVideoId(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (
        url.pathname.startsWith("/embed/") ||
        url.pathname.startsWith("/shorts/")
      ) {
        return url.pathname.split("/").filter(Boolean)[1] ?? null;
      }
    }

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

export function isYouTubeWatchUrl(urlString: string): boolean {
  return Boolean(getYouTubeVideoId(urlString));
}

export function youtubeWatchUrl(videoId: string, startSeconds?: number) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (startSeconds !== undefined) {
    url.searchParams.set("t", `${Math.max(0, Math.floor(startSeconds))}s`);
  }
  return url.toString();
}

export function buildDefaultClipRange(currentTime: number, duration?: number) {
  const safeCurrent = Number.isFinite(currentTime)
    ? Math.max(0, currentTime)
    : 0;
  const start = Math.max(
    0,
    Math.floor(safeCurrent - DEFAULT_CLIP_WINDOW_SECONDS),
  );
  const unclampedEnd = Math.ceil(safeCurrent + DEFAULT_CLIP_WINDOW_SECONDS);
  const end =
    duration && Number.isFinite(duration)
      ? Math.min(Math.ceil(duration), unclampedEnd)
      : unclampedEnd;
  return { start, end: Math.max(start + 1, end) };
}

export function formatClipTime(totalSeconds?: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
