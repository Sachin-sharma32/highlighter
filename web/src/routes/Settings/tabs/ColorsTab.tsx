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
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Highlight colors
      </h1>
      <p
        className="text-sm leading-6"
        style={{ color: "var(--ink-3)", maxWidth: 620 }}
      >
        Rename colors to match how you actually read. The first five colors are
        available from the extension toolbar with number keys.
      </p>

      <div
        className="mt-8 overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--rule)" }}
      >
        {colors.map((color, index) => (
          <div
            key={color.id}
            className="grid items-center border-b px-4"
            style={{
              gridTemplateColumns: "42px 1fr 120px 28px",
              height: 45,
              borderColor: "var(--rule)",
              borderBottomWidth: index === colors.length - 1 ? 0 : 1,
            }}
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
              className="bg-transparent text-sm font-medium outline-none"
              style={{ color: "var(--ink)" }}
            />
            <span
              className="font-mono text-[11px]"
              style={{ color: "var(--ink-4)" }}
            >
              {color.shortcut ? (
                <>
                  Press{" "}
                  <kbd
                    className="rounded border px-1"
                    style={{
                      borderColor: "var(--rule-2)",
                      background: "var(--paper-2)",
                    }}
                  >
                    {color.shortcut}
                  </kbd>
                </>
              ) : (
                "No shortcut"
              )}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex size-7 items-center justify-center rounded"
                  style={{ color: "var(--ink-4)" }}
                >
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
          className="mt-4 flex items-center gap-2 text-sm"
          style={{ color: "var(--ink-3)" }}
        >
          <Plus size={13} /> Add a color
        </button>
      )}
    </>
  );
}
