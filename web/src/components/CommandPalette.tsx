import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Sparkles, FileText, Folder } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

type CommandHighlight = {
  _id: Id<"highlights">;
  title: string;
  text: string;
  color: string;
};

type CommandCollection = {
  _id: Id<"collections">;
  name: string;
};

const COLOR_DOT: Record<string, string> = {
  amber: "var(--hl-amber)",
  rose: "var(--hl-rose)",
  sage: "var(--hl-sage)",
  sky: "var(--hl-sky)",
  violet: "var(--hl-violet)",
};

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSelectedHighlight,
    setActiveCollection,
    searchQuery,
  } = useAppStore();
  const [query, setQuery] = useState(searchQuery);

  const highlights = (useQuery(api.highlights.list, {
    search: query || undefined,
  }) ?? []) as CommandHighlight[];
  const collections = (useQuery(api.collections.list) ??
    []) as CommandCollection[];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandPaletteOpen]);

  function handleSelectHighlight(id: Id<"highlights">) {
    setSelectedHighlight(id);
    setCommandPaletteOpen(false);
  }

  function handleSelectCollection(id: Id<"collections">) {
    setActiveCollection(id);
    setCommandPaletteOpen(false);
  }

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent
        data-testid="command-palette"
        className="p-0 gap-0 overflow-hidden max-w-[620px] rounded-[14px] border border-rule shadow-[var(--shadow-3)]"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2.5 px-4 border-b border-rule h-[50px]">
            <Sparkles size={14} className="text-accent-2 shrink-0" />
            <CommandInput
              data-testid="command-palette-input"
              placeholder="Search highlights, notes, sources…"
              value={query}
              onValueChange={setQuery}
              className="flex-1 border-0 outline-none bg-transparent text-sm font-display text-ink h-full p-0"
            />
            <kbd className="font-mono text-[10px] px-1.5 py-[1px] rounded bg-paper-2 border border-rule-2 text-ink-3 shrink-0">
              esc
            </kbd>
          </div>
          <CommandList className="max-h-96 noscroll bg-paper">
            <CommandEmpty>
              <div className="py-8 text-center text-sm text-ink-4">
                No results found
              </div>
            </CommandEmpty>

            {highlights.length > 0 && (
              <CommandGroup heading="Highlights" className="p-1.5">
                {highlights.slice(0, 6).map((h: CommandHighlight) => (
                  <CommandItem
                    key={h._id}
                    value={h._id}
                    onSelect={() => handleSelectHighlight(h._id)}
                    data-testid="command-highlight-result"
                    className="flex gap-2.5 rounded-lg cursor-pointer px-3 py-2.5"
                  >
                    <div
                      className="w-[3px] rounded-sm shrink-0 self-stretch"
                      style={{
                        background: COLOR_DOT[h.color] ?? COLOR_DOT.amber,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-ink-4 mb-0.5">
                        {h.title}
                      </div>
                      <div className="font-display text-[13px] text-ink-2 leading-tight truncate">
                        {h.text}
                      </div>
                    </div>
                    <FileText
                      size={12}
                      className="text-ink-4 shrink-0 mt-0.5"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {collections.length > 0 && query.length === 0 && (
              <CommandGroup heading="Collections" className="p-1.5">
                {collections.map((c: CommandCollection) => (
                  <CommandItem
                    key={c._id}
                    value={`col-${c._id}`}
                    onSelect={() => handleSelectCollection(c._id)}
                    className="flex gap-2.5 rounded-lg cursor-pointer px-3 py-2"
                  >
                    <Folder size={13} className="text-ink-4" />
                    <span className="text-[13px] text-ink-2">{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer */}
          <div className="flex gap-4 px-3.5 py-2 border-t border-rule bg-paper-2">
            {[
              ["↑↓", "navigate"],
              ["↵", "open"],
              ["esc", "close"],
            ].map(([key, label]) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-[10px] text-ink-4"
              >
                <kbd className="font-mono text-[10px] px-1 py-[1px] rounded bg-paper border border-rule-2 text-ink-3">
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
