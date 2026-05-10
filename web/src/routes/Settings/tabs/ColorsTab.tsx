import { useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddColorForm } from "./AddColorForm";
import type { ColorSetting } from "../lib";

export function ColorsTab({
  colors,
  updateColors,
}: {
  colors: ColorSetting[];
  updateColors: (next: ColorSetting[]) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold">
        Highlight colors
      </h1>
      <p className="max-w-[620px] text-sm leading-6 text-ink-3">
        Rename colors to match how you actually read. The first five colors are
        available from the extension toolbar with number keys.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-rule">
        {colors.map((color, index) => (
          <div
            key={color.id}
            className={`grid h-[45px] grid-cols-[42px_1fr_120px_28px] items-center border-rule px-4 ${
              index === colors.length - 1 ? "" : "border-b"
            }`}
          >
            <span
              className="h-5 w-8 rounded"
              style={{ background: color.value }}
            />
            <input
              value={color.label}
              onChange={(event) =>
                updateColors(
                  colors.map((item) =>
                    item.id === color.id
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                )
              }
              className="bg-transparent text-sm font-medium text-ink outline-none"
            />
            <span className="font-mono text-[11px] text-ink-4">
              {color.shortcut ? (
                <>
                  Press{" "}
                  <kbd className="rounded border border-rule-2 bg-paper-2 px-1">
                    {color.shortcut}
                  </kbd>
                </>
              ) : (
                "No shortcut"
              )}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex size-7 items-center justify-center rounded text-ink-4">
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={color.isDefault}
                  onClick={() =>
                    updateColors(colors.filter((item) => item.id !== color.id))
                  }
                  className="gap-2 text-xs"
                >
                  <Trash2 size={12} /> Remove color
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {adding ? (
        <AddColorForm
          existingCount={colors.length}
          onCancel={() => setAdding(false)}
          onAdd={(next) => {
            updateColors([...colors, next]);
            setAdding(false);
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 flex items-center gap-2 text-sm text-ink-3"
        >
          <Plus size={13} /> Add a color
        </button>
      )}
    </>
  );
}
