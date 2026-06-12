import { useState } from "react";
import { ChevronDown, Folder, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COLORS, HL_COLORS, type Collection, type HighlightColor } from "./lib";
import type { Id } from "../../../../convex/_generated/dataModel";

export function MetadataStrip({
  color,
  collectionId,
  collections,
  tags,
  activeTag,
  onColorChange,
  onCollectionChange,
  onSelectTag,
  onAddTag,
  onRemoveTag,
}: {
  color: HighlightColor;
  collectionId: Id<"collections"> | undefined;
  collections: Collection[];
  tags: string[];
  activeTag?: string | null;
  onColorChange: (color: HighlightColor) => void;
  onCollectionChange: (value: string) => void;
  onSelectTag?: (tag: string) => void;
  onAddTag: (tag: string) => void | Promise<void>;
  onRemoveTag: (tag: string) => void | Promise<void>;
}) {
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);

  const currentCollection = collections.find((c) => c._id === collectionId);
  const collectionLabel = currentCollection?.name ?? "Inbox";

  async function commitTag() {
    const tag = newTag.trim().replace(/^#/, "").replace(/\s+/g, "-");
    if (tag) await onAddTag(tag);
    setNewTag("");
    setAddingTag(false);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* Color swatches */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            data-testid={`highlight-color-${c}`}
            title={c}
            style={{ background: HL_COLORS[c] }}
            className={cn(
              "h-4 w-4 rounded-full transition-all duration-150 ease-spring hover:scale-125",
              color === c
                ? "scale-110 ring-1 ring-ink ring-offset-2 ring-offset-paper"
                : "ring-1 ring-[oklch(0%_0_0_/_0.08)]",
            )}
          />
        ))}
      </div>

      <span className="h-3.5 w-px bg-rule" />

      {/* Collection */}
      <Popover open={collectionOpen} onOpenChange={setCollectionOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-[22px] items-center gap-1 rounded-full border border-rule bg-paper-2 px-2 text-[11px] text-ink-2 hover:border-ink-4"
          >
            <Folder size={10} className="text-ink-4" />
            <span className="truncate max-w-[140px]">{collectionLabel}</span>
            <ChevronDown size={10} className="text-ink-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-1">
          <button
            type="button"
            onClick={() => {
              onCollectionChange("inbox");
              setCollectionOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-paper-2",
              !collectionId && "font-medium text-ink",
            )}
          >
            <Folder size={11} className="text-ink-4" /> Inbox
          </button>
          {collections.map((collection) => (
            <button
              key={collection._id}
              type="button"
              onClick={() => {
                onCollectionChange(collection._id);
                setCollectionOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-paper-2",
                collectionId === collection._id && "font-medium text-ink",
              )}
            >
              <Folder size={11} className="text-ink-4" />{" "}
              <span className="truncate">{collection.name}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <span className="h-3.5 w-px bg-rule" />

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              "inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-[11px] text-ink-2",
              activeTag === tag
                ? "border-accent bg-accent-tint"
                : "border-rule bg-paper-2",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectTag?.(tag)}
              className={cn(
                "text-inherit",
                onSelectTag ? "cursor-pointer" : "cursor-default",
              )}
            >
              #{tag}
            </button>
            <button
              type="button"
              onClick={() => void onRemoveTag(tag)}
              className="ml-0.5 cursor-pointer leading-none text-ink-4 hover:text-red-500"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            autoFocus
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void commitTag();
              if (event.key === "Escape") {
                setAddingTag(false);
                setNewTag("");
              }
            }}
            onBlur={() => {
              if (newTag) void commitTag();
              else setAddingTag(false);
            }}
            placeholder="tag name"
            className="h-[22px] w-[90px] rounded-full border border-accent bg-accent-tint px-2 text-[11px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingTag(true)}
            className="inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed border-rule-2 px-2 text-[11px] text-ink-4 hover:border-ink-4 hover:text-ink-3"
          >
            <Plus size={10} /> tag
          </button>
        )}
      </div>
    </div>
  );
}
