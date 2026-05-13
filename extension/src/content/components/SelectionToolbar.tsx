import type { MouseEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type SelectionActionKey = "copy" | "note" | "tag" | "copySource";

interface Props {
  text: string;
  colors: { id: string; color: string }[];
  copied: boolean;
  onSaveColor: (color: string) => void;
  onAction: (key: SelectionActionKey) => void;
}

const ROWS: { label: string; kbd: string; key: SelectionActionKey }[] = [
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
  colors,
  copied,
  onSaveColor,
  onAction,
}: Props) {
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
              onSaveColor(c.id);
            }}
          />
        ))}
      </div>

      <Separator />

      {copied ? (
        <div className="flex items-center justify-center gap-1.5 py-3 font-mono text-[11px] uppercase tracking-widest text-ink-2">
          <Check size={12} />
          Copied to clipboard
        </div>
      ) : (
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
                onAction(row.key);
              }}
            >
              <span className="text-xs">{row.label}</span>
              <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-rule bg-paper px-1 font-mono text-[10px] text-ink-4">
                {row.kbd}
              </kbd>
            </Button>
          ))}
        </div>
      )}

      <Separator />

      <div className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-4">
        {charCount} char{charCount === 1 ? "" : "s"} selected
      </div>
    </div>
  );
}
