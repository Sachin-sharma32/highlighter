import { Loader2 } from "lucide-react";
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
    <div className="flex justify-center pt-10">
      <Loader2 size={18} className="animate-spin text-ink-4" />
    </div>
  );
}

function EmptyState({ scope }: { scope: Scope }) {
  return (
    <div className="pt-10 text-center text-xs leading-6 text-ink-4">
      {scope === "page" ? (
        <>
          <p>No highlights on this page yet.</p>
          <p className="mt-1">Select text to start highlighting.</p>
        </>
      ) : (
        <>
          <p>No highlights saved yet.</p>
          <p className="mt-1">
            Highlights you save across the web will appear here.
          </p>
        </>
      )}
    </div>
  );
}
