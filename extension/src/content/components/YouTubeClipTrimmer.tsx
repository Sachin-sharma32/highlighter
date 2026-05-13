import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SaveHighlightPayload } from "../../lib/messages";
import { friendlyErrorMessage } from "../../lib/errors";
import { youtubeWatchUrl, formatClipTime } from "../../lib/youtube";
import { notifyYouTubeClipSaved } from "../api";
import {
  clipMarkEnd,
  clipMarkStart,
  clipSetOffset,
  resetClipState,
  useClipState,
  type ClipOffset,
} from "../clipStore";

interface ClipContext {
  videoId: string;
  title: string;
  url: string;
  duration?: number;
  channelTitle?: string;
}

interface Props {
  context: ClipContext;
  readCurrentTime: () => number;
  readDuration: () => number;
  seekTo: (t: number) => void;
  onClose: () => void;
}

const CLOSE_DELAY_MS = 900;
const OFFSETS: readonly ClipOffset[] = [5, 15, 30];
type Tone = "muted" | "error" | "success";

const TONE_CLASS: Record<Tone, string> = {
  muted: "text-ink-4",
  error: "text-rose-600",
  success: "text-emerald-600",
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function YouTubeClipTrimmer({
  context,
  readCurrentTime,
  readDuration,
  seekTo,
  onClose,
}: Props) {
  const { offset, lockedStart, lockedEnd } = useClipState();
  const [playhead, setPlayhead] = useState<number>(() => readCurrentTime());
  const [duration, setDuration] = useState<number>(
    () => readDuration() || context.duration || 0,
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: Tone }>({
    text: "Pick a ±buffer, or mark Start and End manually.",
    tone: "muted",
  });
  const draggingRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = readCurrentTime();
      const d = readDuration();
      setPlayhead((prev) => (Math.abs(prev - t) > 0.03 ? t : prev));
      if (d > 0) setDuration((prev) => (Math.abs(prev - d) > 0.1 ? d : prev));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [readCurrentTime, readDuration]);

  const safeDuration = duration > 0 ? duration : 1;
  const offsetMode = offset !== null;

  const startValue = offsetMode
    ? clamp(playhead - offset!, 0, safeDuration)
    : lockedStart;
  const endValue = offsetMode
    ? clamp(playhead + offset!, 0, safeDuration)
    : lockedEnd;
  const startVisible = startValue !== null;
  const endVisible = endValue !== null;

  const manualBothSet =
    !offsetMode &&
    lockedStart !== null &&
    lockedEnd !== null &&
    lockedEnd > lockedStart;
  const canSave = !saving && (offsetMode || manualBothSet);
  const endButtonDisabled = saving || lockedStart === null;

  useEffect(() => {
    if (saving) return;
    if (offsetMode) {
      setStatus({
        text: `Saving a ±${offset}s window around the playhead.`,
        tone: "success",
      });
    } else if (lockedStart === null && lockedEnd === null) {
      setStatus({
        text: "Pick a ±buffer, or mark Start and End manually.",
        tone: "muted",
      });
    } else if (lockedStart === null) {
      setStatus({ text: "Mark Start to enable save.", tone: "muted" });
    } else if (lockedEnd === null) {
      setStatus({ text: "Mark End to enable save.", tone: "muted" });
    } else if (lockedEnd <= lockedStart) {
      setStatus({ text: "End must be after start.", tone: "error" });
    } else {
      setStatus({ text: "Ready to save.", tone: "success" });
    }
  }, [offsetMode, offset, lockedStart, lockedEnd, saving]);

  const handleOffsetClick = (o: ClipOffset) => {
    if (saving) return;
    clipSetOffset(offset === o ? null : o);
  };

  const handleStart = () => {
    if (saving) return;
    clipMarkStart(clamp(playhead, 0, safeDuration));
  };

  const handleEnd = () => {
    if (endButtonDisabled) return;
    clipMarkEnd(clamp(playhead, 0, safeDuration));
  };

  const resetAll = () => {
    if (saving) return;
    resetClipState();
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus({ text: "Saving clip…", tone: "muted" });

    let s: number;
    let e: number;
    if (offsetMode) {
      s = Math.floor(clamp(playhead - offset!, 0, safeDuration));
      e = Math.floor(clamp(playhead + offset!, 0, safeDuration));
    } else {
      s = Math.floor(lockedStart!);
      e = Math.floor(lockedEnd!);
    }
    e = Math.max(s + 1, e);

    const payload: SaveHighlightPayload = {
      url: youtubeWatchUrl(context.videoId),
      title: context.title,
      text: `YouTube clip ${formatClipTime(s)}-${formatClipTime(e)}`,
      color: "sky",
      note: note.trim() || undefined,
      sourceType: "youtube",
      youtubeVideoId: context.videoId,
      clipStart: s,
      clipEnd: e,
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
      setNote("");
      resetClipState();
      window.setTimeout(() => {
        setSaving(false);
      }, CLOSE_DELAY_MS);
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

  const selectedSeconds =
    startVisible && endVisible && startValue !== null && endValue !== null
      ? Math.max(0, Math.floor(endValue - startValue))
      : 0;
  const playheadPct = (clamp(playhead, 0, safeDuration) / safeDuration) * 100;
  const startPct =
    startVisible && startValue !== null
      ? (startValue / safeDuration) * 100
      : null;
  const endPct =
    endVisible && endValue !== null ? (endValue / safeDuration) * 100 : null;

  const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    seekTo(pct * safeDuration);
  };

  const handleRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (saving) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    seekFromPointer(e);
  };

  const handleRailPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromPointer(e);
  };

  const handleRailPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const showResetLink =
    offset !== null || lockedStart !== null || lockedEnd !== null;
  <div className="flex justify-center items-center rounded border border-rule bg-paper-2 pt-2 w-6 h-6 font-mono text-[9px] text-ink-3 no-underline">
    R
  </div>;

  return (
    <div className="font-ui relative mt-3 rounded-md border border-accent bg-paper-2 px-4 pb-4 pt-4 text-ink">
      <div
        className="absolute -top-2.5 left-4 inline-flex items-center rounded px-2 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper"
        style={{ background: "var(--accent-color)" }}
      >
        Clipping
      </div>

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-1">
          <div className="font-display line-clamp-2 text-[16px] font-medium leading-tight tracking-tight text-ink">
            {context.title}
          </div>
          <div className="mt-1 text-[11px] leading-tight text-ink-3">
            {context.channelTitle ? (
              <>
                {context.channelTitle}
                <span className="mx-1.5 text-ink-4">·</span>
              </>
            ) : null}
            <span className="font-mono">{formatClipTime(duration)}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-rule bg-transparent text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-5">
        <RangeRuler
          startPct={startPct}
          endPct={endPct}
          playheadPct={playheadPct}
          playheadLabel={formatClipTime(playhead)}
          startLabel={startValue !== null ? formatClipTime(startValue) : ""}
          endLabel={endValue !== null ? formatClipTime(endValue) : ""}
          startLocked={!offsetMode && lockedStart !== null}
          endLocked={!offsetMode && lockedEnd !== null}
          onPointerDown={handleRailPointerDown}
          onPointerMove={handleRailPointerMove}
          onPointerUp={handleRailPointerUp}
        />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-dashed border-rule pt-2.5 font-mono text-[11px] text-ink-3">
        <span>0:00</span>
        <span className="inline-flex items-center rounded-full border border-rule bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-2">
          {formatClipTime(selectedSeconds)} selected
        </span>
        <span>{formatClipTime(duration)}</span>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <ActionPill
          label="Start"
          shortcut="Q"
          value={lockedStart !== null ? formatClipTime(lockedStart) : "—:—"}
          locked={!offsetMode && lockedStart !== null}
          onClick={handleStart}
          disabled={saving}
        />
        <ActionPill
          label="End"
          shortcut="E"
          value={lockedEnd !== null ? formatClipTime(lockedEnd) : "—:—"}
          locked={!offsetMode && lockedEnd !== null}
          onClick={handleEnd}
          disabled={endButtonDisabled}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          {OFFSETS.map((o) => {
            const selected = o === offset;
            return (
              <button
                key={o}
                type="button"
                onClick={() => handleOffsetClick(o)}
                disabled={saving}
                className={`inline-flex cursor-pointer items-center justify-center rounded-md px-2.5 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                  selected
                    ? "border border-ink bg-ink text-paper"
                    : "border border-rule bg-paper text-ink-2 hover:border-rule-2"
                } ${saving ? "cursor-not-allowed opacity-50" : ""}`}
              >
                ±{o}s
              </button>
            );
          })}
        </div>
        <span className="text-[11px] leading-tight text-ink-4">
          around playhead
        </span>
      </div>

      <Textarea
        className="mt-3 min-h-[64px] resize-none rounded-md border-rule bg-paper text-[13px] leading-5"
        placeholder="Add a note if this idea needs context…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div
        className={`mt-2 min-h-[16px] text-[11px] leading-tight ${TONE_CLASS[status.tone]}`}
      >
        {status.text}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-rule pt-3">
        {showResetLink ? (
          <button
            type="button"
            onClick={resetAll}
            disabled={saving}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] leading-tight text-ink-3 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Reset
            <div className="flex justify-center w-6 h-6 pt-2 items-center rounded bg-gray-200 border-white/30 bg-white/10 font-mono text-[9px] font-medium">
              R
            </div>
          </button>
        ) : (
          <span className="text-[11px] leading-tight text-ink-4">
            Drag the rail to seek · q / e mark · s save · r reset.
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-md"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            Save clip
            <div className="flex justify-center w-6 h-6 pt-2 items-center rounded border border-white/30 bg-white/10 font-mono text-[9px] font-medium">
              S
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ActionPillProps {
  label: string;
  shortcut?: string;
  value: string;
  locked: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ActionPill({
  label,
  shortcut,
  value,
  locked,
  onClick,
  disabled,
}: ActionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
        locked
          ? "border-accent bg-paper"
          : "border-rule bg-paper hover:border-rule-2"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      style={locked ? { boxShadow: "0 0 0 2px var(--accent-tint)" } : undefined}
    >
      <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-ink-4">
        {label}
        {shortcut ? (
          <span className="inline-flex items-center rounded border border-rule bg-paper-2 px-1 py-px font-mono text-[9px] text-ink-3">
            {shortcut}
          </span>
        ) : null}
      </span>
      <span
        className={`font-display text-[15px] font-medium tabular-nums tracking-tight ${
          locked ? "text-ink" : "text-ink-3"
        }`}
      >
        {value}
      </span>
    </button>
  );
}

interface RangeRulerProps {
  startPct: number | null;
  endPct: number | null;
  playheadPct: number;
  playheadLabel: string;
  startLabel: string;
  endLabel: string;
  startLocked: boolean;
  endLocked: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function RangeRuler({
  startPct,
  endPct,
  playheadPct,
  playheadLabel,
  startLabel,
  endLabel,
  startLocked,
  endLocked,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: RangeRulerProps) {
  const hasRange = startPct !== null && endPct !== null;
  const left = hasRange ? Math.min(startPct!, endPct!) : 0;
  const width = hasRange ? Math.max(0, Math.abs(endPct! - startPct!)) : 0;

  return (
    <div
      className="relative h-[80px] cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute top-0 z-10"
        style={{ left: `${playheadPct}%`, transform: "translateX(-50%)" }}
      >
        <div
          className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-paper"
          style={{ background: "var(--accent-color)" }}
        >
          {playheadLabel}
        </div>
        <div
          className="mx-auto h-1.5 w-px"
          style={{ background: "var(--accent-color)" }}
        />
      </div>

      <div className="absolute inset-x-0 top-[28px] flex justify-between">
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            className={`w-px ${
              i % 2 === 0 ? "h-1.5 bg-ink-4" : "h-[3px] bg-rule-2"
            }`}
            style={{ opacity: 0.6 }}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 top-[38px] h-1 rounded-full bg-rule-2" />

      {hasRange && (
        <div
          className="absolute top-[35px] h-2.5 rounded-full bg-hl-amber"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        />
      )}

      <div
        className="absolute top-[32px] h-[14px] w-[2px] rounded-sm"
        style={{
          left: `${playheadPct}%`,
          background: "var(--accent-color)",
          transform: "translateX(-50%)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.6)",
        }}
      />

      {startPct !== null && (
        <RailHandle
          pct={startPct}
          kind="start"
          label={startLabel}
          locked={startLocked}
        />
      )}

      {endPct !== null && (
        <RailHandle
          pct={endPct}
          kind="end"
          label={endLabel}
          locked={endLocked}
        />
      )}
    </div>
  );
}

function RailHandle({
  pct,
  kind,
  label,
  locked,
}: {
  pct: number;
  kind: "start" | "end";
  label: string;
  locked: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{ left: `${pct}%`, top: "50px", transform: "translateX(-50%)" }}
    >
      <div
        className="mx-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderBottom: locked
            ? "6px solid var(--accent-color)"
            : "6px solid var(--ink)",
        }}
      />
      <div
        className="flex h-4 w-4 items-center justify-center rounded-sm font-mono text-[10px] font-bold text-paper"
        style={{
          background: locked ? "var(--accent-color)" : "var(--ink)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        }}
      >
        {kind === "start" ? "⟨" : "⟩"}
      </div>
      <div
        className="absolute top-[24px] inline-flex items-center whitespace-nowrap rounded border bg-paper px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-ink-2"
        style={{
          borderColor: locked ? "var(--accent-color)" : "var(--rule)",
          left: kind === "start" ? "auto" : "calc(50% + 8px)",
          right: kind === "start" ? "calc(50% + 8px)" : "auto",
        }}
      >
        {label}
      </div>
    </div>
  );
}
