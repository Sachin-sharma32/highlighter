import type { Highlight, Scope } from "../types";
import { HighlightRow } from "./HighlightRow";

interface HighlightListProps {
  highlights: Highlight[];
  scope: Scope;
  loading: boolean;
  onOpen: (h: Highlight) => void;
  onCopy: (text: string) => void;
  onDelete: (h: Highlight) => void;
}

export function HighlightList({
  highlights,
  scope,
  loading,
  onOpen,
  onCopy,
  onDelete,
}: HighlightListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-2">
      {loading ? (
        <Loading />
      ) : highlights.length === 0 ? (
        <EmptyState scope={scope} />
      ) : (
        highlights.map((h, i) => (
          <HighlightRow
            key={h._id}
            highlight={h}
            showSource={scope === "all"}
            withDivider={i < highlights.length - 1}
            onOpen={onOpen}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3 pt-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 py-1">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ scope }: { scope: Scope }) {
  return (
    <div className="animate-fade-up pt-8 text-center text-xs leading-6 text-ink-4">
      {/* A page in miniature, with one marked line */}
      <div
        aria-hidden
        className="mx-auto mb-4 w-28 space-y-2 rounded-lg border border-rule bg-paper-2 p-3 shadow-paper-1"
      >
        <div className="h-1.5 w-full rounded-full bg-paper-3" />
        <div className="h-1.5 w-4/5 rounded-full bg-paper-3" />
        <div className="h-1.5 w-11/12 rounded-full bg-hl-amber" />
        <div className="h-1.5 w-3/5 rounded-full bg-paper-3" />
      </div>
      {scope === "page" ? (
        <>
          <p className="font-display text-[13px] text-ink-3">
            Nothing marked on this page
          </p>
          <p className="mt-1">Select any text to start highlighting.</p>
        </>
      ) : (
        <>
          <p className="font-display text-[13px] text-ink-3">
            No highlights saved yet
          </p>
          <p className="mt-1">
            Highlights you save across the web will appear here.
          </p>
        </>
      )}
    </div>
  );
}
