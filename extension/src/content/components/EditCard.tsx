import { useEffect, useRef, useState } from "react";
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
    <>
      <div className="marginalia-swatch-row">
        {colors.map((c) => (
          <button
            key={c.id}
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

      <div className="marginalia-section">
        <div className="marginalia-section-label">Collections</div>
        <CollectionSelect
          collections={collections}
          selectedIds={collectionIds}
          onChange={handleCollections}
          container={shadowContainer}
        />
      </div>

      <div className="marginalia-section">
        <div className="marginalia-section-label">Tags</div>
        <div className="marginalia-tag-editor">
          {tags.map((t) => (
            <span key={t} className="marginalia-tag-chip">
              {`#${t} `}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  removeTag(t);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            className="marginalia-tag-input"
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

      <div className="marginalia-section">
        <div className="marginalia-section-label">Note</div>
        <textarea
          ref={noteRef}
          className="marginalia-edit-note"
          placeholder="Add a note…"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
        />
      </div>

      <div className="marginalia-edit-actions">
        <button
          className="marginalia-pop-btn marginalia-pop-btn-danger"
          onMouseDown={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          Delete
        </button>
        <button
          className="marginalia-pop-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            commitNote();
            onClose();
          }}
        >
          Done
        </button>
      </div>
    </>
  );
}
