import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { SaveHighlightPayload } from "../../lib/messages";
import { friendlyErrorMessage } from "../../lib/errors";
import { youtubeWatchUrl, formatClipTime } from "../../lib/youtube";
import { notifyYouTubeClipSaved } from "../api";

interface ClipContext {
  videoId: string;
  title: string;
  url: string;
  channelTitle?: string;
}

interface Props {
  context: ClipContext;
  readCurrentTime: () => number;
  onClose: () => void;
}

const CLOSE_DELAY_MS = 900;

type Tone = "muted" | "error" | "success";

const TONE_CLASS: Record<Tone, string> = {
  muted: "text-ink-4",
  error: "text-rose-600",
  success: "text-emerald-600",
};

export function YouTubeClipTrimmer({
  context,
  readCurrentTime,
  onClose,
}: Props) {
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({
    text: "Save unlocks once both start and end are marked.",
    tone: "muted" as Tone,
  });

  const startBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startBtnRef.current?.focus();
  }, []);

  const missing = start === null || end === null;
  const invalid = !missing && end! <= start!;

  useEffect(() => {
    if (saving) return;
    if (missing) {
      setStatus({
        text: "Save unlocks once both start and end are marked.",
        tone: "muted",
      });
    } else if (invalid) {
      setStatus({ text: "End must be after start.", tone: "error" });
    } else {
      setStatus({ text: "Ready to save.", tone: "success" });
    }
  }, [missing, invalid, saving]);

  const rangeText =
    start !== null && end !== null
      ? `${formatClipTime(start)} – ${formatClipTime(end)}`
      : "Mark start and end while the video plays";

  const handleSave = async () => {
    if (saving || start === null || end === null || end <= start) return;
    setSaving(true);
    setStatus({ text: "Saving clip…", tone: "muted" });

    const payload: SaveHighlightPayload = {
      url: youtubeWatchUrl(context.videoId),
      title: context.title,
      text: `YouTube clip ${formatClipTime(start)}-${formatClipTime(end)}`,
      color: "sky",
      note: note.trim() || undefined,
      sourceType: "youtube",
      youtubeVideoId: context.videoId,
      clipStart: start,
      clipEnd: end,
      youtubeChannelTitle: context.channelTitle,
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_HIGHLIGHT",
        payload,
      });
      if (!response?.ok)
        throw new Error(response?.error ?? "Could not save clip.");
      setStatus({ text: "Saved to dashboard.", tone: "success" });
      notifyYouTubeClipSaved();
      window.setTimeout(onClose, CLOSE_DELAY_MS);
    } catch (error) {
      setSaving(false);
      setStatus({
        text: friendlyErrorMessage(
          error,
          "We couldn’t save this clip. Please try again.",
        ),
        tone: "error",
      });
    }
  };

  return (
    <div className="font-ui flex flex-col gap-3 rounded-lg border border-rule bg-paper-2 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
            Marginalia clip
          </div>
          <div className="mt-1 line-clamp-2 font-display text-[15px] font-medium leading-snug text-ink">
            {context.title}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-full"
          title="Close"
          onClick={onClose}
        >
          <X size={14} />
        </Button>
      </div>

      <p className="text-xs leading-5 text-ink-3">
        Play the video, then mark the beginning and end of the moment you want
        to save.
      </p>

      <div className="rounded border border-rule bg-paper px-3 py-2 font-mono text-xs text-ink-2">
        {rangeText}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          ref={startBtnRef}
          type="button"
          className="group flex min-h-[64px] cursor-pointer flex-col items-start justify-between rounded border border-rule bg-paper px-3 py-2 text-left transition-colors hover:border-accent focus:border-accent focus:outline-none"
          onClick={() => setStart(readCurrentTime())}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-4">
            Set start
          </span>
          <strong className="font-display text-lg font-medium text-ink">
            {start === null ? "Not set" : formatClipTime(start)}
          </strong>
        </button>
        <button
          type="button"
          className="group flex min-h-[64px] cursor-pointer flex-col items-start justify-between rounded border border-rule bg-paper px-3 py-2 text-left transition-colors hover:border-accent focus:border-accent focus:outline-none"
          onClick={() => setEnd(readCurrentTime())}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-4">
            Set end
          </span>
          <strong className="font-display text-lg font-medium text-ink">
            {end === null ? "Not set" : formatClipTime(end)}
          </strong>
        </button>
      </div>

      <Textarea
        className="min-h-[64px] resize-none text-xs leading-5"
        placeholder="Add a note if this idea needs context…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className={`min-h-[18px] text-xs ${TONE_CLASS[status.tone]}`}>
        {status.text}
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={missing || invalid || saving}
          onClick={() => void handleSave()}
        >
          Save clip
        </Button>
      </div>
    </div>
  );
}
