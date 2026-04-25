export function youtubeWatchUrl(videoId: string, startSeconds?: number) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (startSeconds !== undefined) {
    url.searchParams.set("t", `${Math.max(0, Math.floor(startSeconds))}s`);
  }
  return url.toString();
}

export function youtubeEmbedUrl(videoId: string, startSeconds: number, endSeconds: number) {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
  url.searchParams.set("start", String(Math.max(0, Math.floor(startSeconds))));
  url.searchParams.set("end", String(Math.max(0, Math.floor(endSeconds))));
  url.searchParams.set("rel", "0");
  return url.toString();
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
