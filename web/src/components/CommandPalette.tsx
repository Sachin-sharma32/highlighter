import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  const { commandPaletteOpen, setCommandPaletteOpen, setSelectedHighlight, setActiveCollection, searchQuery } = useAppStore();
  const [query, setQuery] = useState(searchQuery);

  const highlights = (useQuery(api.highlights.list, { search: query || undefined }) ?? []) as CommandHighlight[];
  const collections = (useQuery(api.collections.list) ?? []) as CommandCollection[];

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
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: 620, borderRadius: 14, border: "1px solid var(--rule)", boxShadow: "var(--shadow-3)" }}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2.5 px-4 border-b" style={{ borderColor: "var(--rule)", height: 50 }}>
            <Sparkles size={14} style={{ color: "var(--accent-2)", flexShrink: 0 }} />
            <CommandInput
              data-testid="command-palette-input"
              placeholder="Search highlights, notes, sources…"
              value={query}
              onValueChange={setQuery}
              className="flex-1 border-0 outline-none bg-transparent text-sm"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)", height: "100%", padding: 0 }}
            />
            <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "1px 5px", borderRadius: 4, border: "1px solid var(--rule-2)", background: "var(--paper-2)", color: "var(--ink-3)", flexShrink: 0 }}>esc</kbd>
          </div>
          <CommandList className="max-h-96 noscroll" style={{ background: "var(--paper)" }}>
            <CommandEmpty>
              <div className="py-8 text-center text-sm" style={{ color: "var(--ink-4)" }}>No results found</div>
            </CommandEmpty>

            {highlights.length > 0 && (
              <CommandGroup heading="Highlights" style={{ padding: 6 }}>
                {highlights.slice(0, 6).map((h: CommandHighlight) => (
                  <CommandItem
                    key={h._id}
                    value={h._id}
                    onSelect={() => handleSelectHighlight(h._id)}
                    data-testid="command-highlight-result"
                    className="flex gap-2.5 rounded-lg cursor-pointer"
                    style={{ padding: "10px 12px" }}
                  >
                    <div style={{ width: 3, borderRadius: 2, background: COLOR_DOT[h.color] ?? COLOR_DOT.amber, flexShrink: 0, alignSelf: "stretch" }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", marginBottom: 2 }}>{h.title}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }} className="truncate">
                        {h.text}
                      </div>
                    </div>
                    <FileText size={12} style={{ color: "var(--ink-4)", flexShrink: 0, marginTop: 2 }} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {collections.length > 0 && query.length === 0 && (
              <CommandGroup heading="Collections" style={{ padding: 6 }}>
                {collections.map((c: CommandCollection) => (
                  <CommandItem
                    key={c._id}
                    value={`col-${c._id}`}
                    onSelect={() => handleSelectCollection(c._id)}
                    className="flex gap-2.5 rounded-lg cursor-pointer"
                    style={{ padding: "8px 12px" }}
                  >
                    <Folder size={13} style={{ color: "var(--ink-4)" }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer */}
          <div
            className="flex gap-4 px-3.5 py-2"
            style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}
          >
            {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([key, label]) => (
              <span key={label} className="flex items-center gap-1.5" style={{ fontSize: 10, color: "var(--ink-4)" }}>
                <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "1px 4px", borderRadius: 3, border: "1px solid var(--rule-2)", background: "var(--paper)", color: "var(--ink-3)" }}>{key}</kbd>
                {label}
              </span>
            ))}
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
