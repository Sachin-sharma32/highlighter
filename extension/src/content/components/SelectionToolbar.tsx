import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="font-ui flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-1">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
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

      <Separator />

      <div className="flex flex-col gap-0.5">
        {ROWS.map((row) => (
          <Button
            key={row.key}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between rounded px-2 text-ink-2 hover:text-ink"
            onMouseDown={(e) => {
              preventDefault(e);
              handleAction(row.key);
            }}
          >
            <span className="text-xs">{row.label}</span>
            <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-rule bg-paper px-1 font-mono text-[10px] text-ink-4">
              {row.kbd}
            </kbd>
          </Button>
        ))}
      </div>

      <Separator />

      <div className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-4">
        {charCount} char{charCount === 1 ? "" : "s"} selected
      </div>
    </div>
  );
}
