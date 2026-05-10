import { useEffect, useRef, useState } from "react";
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
      ? `${formatClipTime(start)}-${formatClipTime(end)}`
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
    <>
      <div className="marginalia-youtube-clipper-header">
        <div className="marginalia-youtube-clipper-title-wrap">
          <div className="marginalia-youtube-clipper-eyebrow">
            Marginalia clip
          </div>
          <div className="marginalia-youtube-clipper-title">
            {context.title}
          </div>
        </div>
        <button
          type="button"
          className="marginalia-youtube-clipper-icon"
          title="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="marginalia-youtube-clipper-helper">
        Play the video, then mark the beginning and end of the moment you want
        to save.
      </div>

      <div className="marginalia-youtube-clipper-range">{rangeText}</div>

      <div className="marginalia-youtube-clipper-marks">
        <button
          ref={startBtnRef}
          type="button"
          className="marginalia-youtube-clipper-mark-btn"
          onClick={() => setStart(readCurrentTime())}
        >
          <span>Set start</span>
          <strong>{start === null ? "Not set" : formatClipTime(start)}</strong>
        </button>
        <button
          type="button"
          className="marginalia-youtube-clipper-mark-btn"
          onClick={() => setEnd(readCurrentTime())}
        >
          <span>Set end</span>
          <strong>{end === null ? "Not set" : formatClipTime(end)}</strong>
        </button>
      </div>

      <textarea
        className="marginalia-youtube-clipper-note"
        placeholder="Add a note if this idea needs context…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div
        className="marginalia-youtube-clipper-status"
        data-tone={status.tone}
      >
        {status.text}
      </div>

      <div className="marginalia-youtube-clipper-actions">
        <button type="button" className="marginalia-pop-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="marginalia-pop-btn marginalia-youtube-clipper-save"
          disabled={missing || invalid || saving}
          onClick={() => void handleSave()}
        >
          Save clip
        </button>
      </div>
    </>
  );
}
