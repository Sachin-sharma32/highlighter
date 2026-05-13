import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { Collection } from "../settings";
import { CollectionSelect } from "./CollectionSelect";

interface Props {
  initialColor: string;
  initialNote: string;
  initialTags: string[];
  initialCollectionIds: string[];
  colors: { id: string; color: string }[];
  collections: Collection[];
  shadowContainer: HTMLElement;
  focus: "note" | "tag";
  onColorChange: (color: string) => void;
  onNoteCommit: (note: string) => void;
  onTagsChange: (tags: string[]) => void;
  onCollectionsChange: (ids: string[]) => void;
  onDelete: () => void;
  onClose: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-4">
      {children}
    </div>
  );
}

export function EditCard({
  initialColor,
  initialNote,
  initialTags,
  initialCollectionIds,
  colors,
  collections,
  shadowContainer,
  focus,
  onColorChange,
  onNoteCommit,
  onTagsChange,
  onCollectionsChange,
  onDelete,
  onClose,
}: Props) {
  const [color, setColor] = useState(initialColor);
  const [note, setNote] = useState(initialNote);
  const [tags, setTags] = useState(initialTags);
  const [collectionIds, setCollectionIds] = useState(initialCollectionIds);
  const [tagDraft, setTagDraft] = useState("");

  const tagInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focus === "tag") tagInputRef.current?.focus();
    else noteRef.current?.focus();
  }, [focus]);

  const handleColor = (id: string) => {
    setColor(id);
    onColorChange(id);
  };

  const handleCollections = (ids: string[]) => {
    setCollectionIds(ids);
    onCollectionsChange(ids);
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    onTagsChange(next);
  };

  const submitTag = () => {
    const newTag = tagDraft.trim().replace(/^#/, "");
    setTagDraft("");
    if (!newTag || tags.includes(newTag)) return;
    const next = [...tags, newTag];
    setTags(next);
    onTagsChange(next);
  };

  const commitNote = () => {
    onNoteCommit(note);
  };

  return (
    <div className="font-ui flex flex-col gap-3">
      <div className="flex items-center gap-1.5 px-1">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`marginalia-swatch-big${c.id === color ? " active" : ""}`}
            data-color={c.id}
            title={c.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleColor(c.id);
            }}
          />
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <SectionLabel>Collections</SectionLabel>
        <CollectionSelect
          collections={collections}
          selectedIds={collectionIds}
          onChange={handleCollections}
          container={shadowContainer}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionLabel>Tags</SectionLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex h-6 items-center gap-1  border border-rule bg-paper px-2 font-mono text-[10px] text-ink-2"
            >
              {`#${t}`}
              <button
                type="button"
                className="text-ink-4 hover:text-rose-600"
                onMouseDown={(e) => {
                  e.preventDefault();
                  removeTag(t);
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <Input
            ref={tagInputRef}
            className="h-7 w-24 rounded-sm border-accent bg-paper px-2.5 font-mono text-[11px]"
            placeholder="+tag"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitTag();
              }
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionLabel>Note</SectionLabel>
        <Textarea
          ref={noteRef}
          className="min-h-[72px] resize-y border-l-2 border-l-accent bg-paper-3 font-mono text-xs leading-6"
          placeholder="Add a note…"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onMouseDown={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          Delete
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onMouseDown={(e) => {
            e.preventDefault();
            commitNote();
            onClose();
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
