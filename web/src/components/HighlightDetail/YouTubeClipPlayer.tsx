import { Scissors } from "lucide-react";
import { formatClipTime, youtubeEmbedUrl } from "@/lib/youtube";
import {
  highlightDisplayText,
  isYouTubeClip,
  sourceUrl,
  type DetailHighlight,
} from "./lib";

export function YouTubeClipPlayer({
  highlight,
}: {
  highlight: DetailHighlight;
}) {
  if (!isYouTubeClip(highlight)) return null;
  const watchUrl = sourceUrl(highlight);

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-rule bg-paper-2">
      <div className="aspect-video w-full bg-black">
        <iframe
          title={highlightDisplayText(highlight)}
          src={youtubeEmbedUrl(
            highlight.youtubeVideoId!,
            highlight.clipStart!,
            highlight.clipEnd!,
          )}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
            <Scissors size={12} />
            {formatClipTime(highlight.clipStart)}-
            {formatClipTime(highlight.clipEnd)}
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
