import { Plus, X } from "lucide-react";
import { useState } from "react";

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
          className="flex items-center gap-1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 22,
            padding: "0 8px",
            borderRadius: 999,
            fontSize: 11,
            background:
              activeTag === tag ? "var(--accent-tint)" : "var(--paper-2)",
            border: `1px solid ${activeTag === tag ? "var(--accent-color)" : "var(--rule)"}`,
            color: "var(--ink-2)",
          }}
        >
          <button
            type="button"
            onClick={() => onSelectTag?.(tag)}
            style={{
              color: "inherit",
              cursor: onSelectTag ? "pointer" : "default",
            }}
          >
            #{tag}
          </button>
          <button
            type="button"
            onClick={() => void onRemoveTag(tag)}
            className="hover:text-red-500 ml-0.5"
            style={{ color: "var(--ink-4)", lineHeight: 1, cursor: "pointer" }}
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
          style={{
            height: 22,
            padding: "0 8px",
            borderRadius: 999,
            fontSize: 11,
            border: "1px solid var(--accent-color)",
            outline: "none",
            background: "var(--accent-tint)",
            width: 90,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingTag(true)}
          className="flex items-center gap-1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 22,
            padding: "0 8px",
            borderRadius: 999,
            fontSize: 11,
            border: "1px dashed var(--rule-2)",
            color: "var(--ink-4)",
          }}
        >
          <Plus size={10} /> tag
        </button>
      )}
    </div>
  );
}
