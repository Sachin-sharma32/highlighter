import { Copy, Trash2 } from "lucide-react";
import { copyHighlightText, highlightDisplayText, timeAgo } from "../helpers";
import { HL_BG_CLASS, type Highlight } from "../types";

export type HighlightRowVariant = "detailed" | "compact";

interface HighlightRowProps {
  highlight: Highlight;
  variant?: HighlightRowVariant;
  className?: string;
  onClick: (h: Highlight) => void;
  onDelete: (h: Highlight) => void;
}

export function HighlightRow({
  highlight,
  variant = "compact",
  className = "",
  onClick,
  onDelete,
}: HighlightRowProps) {
  const isDetailed = variant === "detailed";
  const text = highlightDisplayText(highlight);

  return (
    <div
      className={`group relative flex w-full gap-2.5 px-4 ${isDetailed ? "py-3" : "py-2"} ${className}`}
    >
      <div
        className={`absolute right-4 ${isDetailed ? "top-3" : "top-2"} flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        <button
          onClick={() => void copyHighlightText(text)}
          title="Copy text"
          className="flex items-center justify-center rounded p-1 text-ink-4 transition-colors hover:text-ink"
        >
          <Copy size={13} />
        </button>
        <button
          onClick={() => void onDelete(highlight)}
          title="Delete highlight"
          className="flex items-center justify-center rounded p-1 text-ink-4 transition-colors hover:text-red-500"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <button
        onClick={() => onClick(highlight)}
        className="flex min-w-0 flex-1 gap-2.5 pr-12 text-left hover:bg-paper-2"
      >
        <div
          className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`}
        />
        <div className="min-w-0 flex-1">
          {isDetailed ? (
            <p
              className={`font-display text-[13px] leading-6 text-ink ${highlight.note ? "mb-1" : "mb-0"}`}
            >
              {text}
            </p>
          ) : (
            <p className="overflow-hidden font-display text-[12.5px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {text}
            </p>
          )}
          {highlight.note && (
            <p
              className={`${isDetailed ? "text-[11px] leading-[1.4]" : "mt-[3px] text-[11px]"} italic text-ink-3`}
            >
              "{highlight.note}"
            </p>
          )}
          {isDetailed && (
            <div className="mt-1 font-mono text-[10px] text-ink-4">
              {timeAgo(highlight.createdAt)}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
