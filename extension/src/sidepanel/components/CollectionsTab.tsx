import { Folder } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Collection, Highlight } from "../types";
import { EmptyState } from "./EmptyState";
import { HighlightRow } from "./HighlightRow";

interface CollectionsTabProps {
  collections: Collection[];
  highlights: Highlight[];
  onRowClick: (h: Highlight) => void;
  onDelete: (h: Highlight) => void;
  selectedCollection: string | null;
  setSelectedCollection: (c: string | null) => void;
}

export function CollectionsTab({
  collections,
  highlights,
  onRowClick,
  onDelete,
  selectedCollection,
  setSelectedCollection,
}: CollectionsTabProps) {
  const filtered = selectedCollection
    ? highlights.filter((h) => h.collectionId === selectedCollection)
    : highlights;

  const uncollected = highlights.filter((h) => !h.collectionId);

  const visible = selectedCollection === "__inbox__" ? uncollected : filtered;

  return (
    <div>
      <div className="px-4 py-2.5 border-b border-rule">
        <div className="flex items-center gap-2">
          <Folder size={12} className="text-ink-4" />
          <Select
            value={selectedCollection ?? "__all__"}
            onValueChange={(val) =>
              setSelectedCollection(val === "__all__" ? null : val)
            }
          >
            <SelectTrigger className="flex-1 h-8 bg-transparent text-xs text-ink outline-none font-mono cursor-pointer border-none shadow-none focus:ring-0 px-0">
              <SelectValue placeholder="All highlights" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="__all__">
                All highlights ({highlights.length})
              </SelectItem>
              <SelectItem value="__inbox__">
                Inbox ({uncollected.length})
              </SelectItem>
              {collections.map((c) => {
                const count = highlights.filter(
                  (h) => h.collectionId === c._id,
                ).length;
                return (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          text="No highlights in this collection."
          sub="Assign highlights to a collection from the edit panel."
        />
      ) : (
        visible.map((highlight) => (
          <HighlightRow
            key={highlight._id}
            highlight={highlight}
            variant="compact"
            className="border-b border-rule"
            onClick={onRowClick}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
