import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function TagEditor({
  tags,
  activeTag,
  onSelectTag,
  onAddTag,
  onRemoveTag,
}: {
  tags: string[];
  activeTag?: string | null;
  onSelectTag?: (tag: string) => void;
  onAddTag: (tag: string) => void | Promise<void>;
  onRemoveTag: (tag: string) => void | Promise<void>;
}) {
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");

  async function commitTag() {
    const tag = newTag.trim().replace(/^#/, "").replace(/\s+/g, "-");
    if (tag) await onAddTag(tag);
    setNewTag("");
    setAddingTag(false);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
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
          className="inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed border-rule-2 px-2 text-[11px] text-ink-4"
        >
          <Plus size={10} /> tag
        </button>
      )}
    </div>
  );
}
