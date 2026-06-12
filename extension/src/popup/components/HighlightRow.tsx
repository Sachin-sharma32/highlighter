import { Copy, Trash2 } from "lucide-react";
import { highlightDisplayText, hostnameOf } from "../helpers";
import { HL_BG_CLASS, type Highlight } from "../types";

interface HighlightRowProps {
  highlight: Highlight;
  showSource: boolean;
  withDivider: boolean;
  onOpen: (h: Highlight) => void;
  onCopy: (text: string) => void;
  onDelete: (h: Highlight) => void;
}

export function HighlightRow({
  highlight,
  showSource,
  withDivider,
  onOpen,
  onCopy,
  onDelete,
}: HighlightRowProps) {
  const text = highlightDisplayText(highlight);

  return (
    <div
      data-testid="popup-highlight-row"
      className={`group relative flex w-full gap-2.5 py-2 transition-colors duration-150 hover:bg-paper-2 ${withDivider ? "border-b border-rule" : ""}`}
    >
      <div className="absolute right-0 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={() => onCopy(text)}
          title="Copy text"
          className="flex items-center justify-center rounded p-1 text-ink-4 transition-colors hover:text-ink"
        >
          <Copy size={13} />
        </button>
        <button
          onClick={() => onDelete(highlight)}
          title="Delete highlight"
          className="flex items-center justify-center rounded p-1 text-ink-4 transition-colors hover:text-red-500"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <button
        onClick={() => onOpen(highlight)}
        className="flex min-w-0 flex-1 gap-2.5 pr-12 text-left"
      >
        <div
          className={`w-[3px] shrink-0 rounded-full ${HL_BG_CLASS[highlight.color]}`}
        />
        <div className="min-w-0 flex-1">
          <p className="overflow-hidden font-display text-[12.5px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {text}
          </p>
          {highlight.note && (
            <p className="mt-[3px] text-[11px] italic text-ink-3">
              "{highlight.note}"
            </p>
          )}
          {showSource && (
            <div className="mt-1 flex items-baseline gap-1.5 truncate font-mono text-[10px] text-ink-4">
              <span className="truncate text-ink-3">
                {highlight.title || hostnameOf(highlight.url)}
              </span>
              <span className="shrink-0">·</span>
              <span className="shrink-0">{hostnameOf(highlight.url)}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
