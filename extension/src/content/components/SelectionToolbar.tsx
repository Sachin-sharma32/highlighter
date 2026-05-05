import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  text: string;
  pageUrl: string;
  pageTitle: string;
  colors: { id: string; color: string }[];
  onSave: (color: string) => void;
  onSaveAndEdit: (focus: "note" | "tag") => void;
  onClose: () => void;
}

const ROWS: {
  label: string;
  kbd: string;
  key: "copy" | "note" | "tag" | "copySource";
}[] = [
  { label: "Copy text", kbd: "Y", key: "copy" },
  { label: "Add note", kbd: "N", key: "note" },
  { label: "Tag…", kbd: "T", key: "tag" },
  { label: "Copy with source", kbd: "C", key: "copySource" },
];

function preventDefault(e: MouseEvent) {
  e.preventDefault();
}

export function SelectionToolbar({
  text,
  pageUrl,
  pageTitle,
  colors,
  onSave,
  onSaveAndEdit,
  onClose,
}: Props) {
  const handleAction = (key: "copy" | "note" | "tag" | "copySource") => {
    switch (key) {
      case "copy":
        onClose();
        void navigator.clipboard.writeText(text).catch(() => {});
        break;
      case "note":
        onClose();
        onSaveAndEdit("note");
        break;
      case "tag":
        onClose();
        onSaveAndEdit("tag");
        break;
      case "copySource": {
        const md = `> ${text}\n\n— ${pageTitle} (${pageUrl})`;
        onClose();
        void navigator.clipboard.writeText(md).catch(() => {});
        break;
      }
    }
  };

  const charCount = text.length;

  return (
    <>
      <div className="marginalia-swatch-row">
        {colors.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant="ghost"
            size="icon"
            className="marginalia-swatch-big"
            data-color={c.id}
            title={`Highlight ${c.id}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSave(c.id);
              onClose();
            }}
          />
        ))}
      </div>

      {ROWS.map((row) => (
        <Button
          key={row.key}
          type="button"
          variant="ghost"
          className="marginalia-action-row"
          onMouseDown={(e) => {
            preventDefault(e);
            handleAction(row.key);
          }}
        >
          <span className="marginalia-action-label">{row.label}</span>
          <span className="marginalia-kbd">{row.kbd}</span>
        </Button>
      ))}

      <div className="marginalia-toolbar-footer">
        {charCount} char{charCount === 1 ? "" : "s"} selected
      </div>
    </>
  );
}
