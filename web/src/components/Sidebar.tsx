import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Highlighter, BookOpen, StickyNote, LayoutGrid, Folder, Plus, RefreshCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

type ActiveCollection = Id<"collections"> | "inbox" | "all" | "notes" | "review";

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "14px 14px 6px" }}>
      {label}
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  count?: string | number;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-2.5 w-full text-left transition-colors"
      style={{
        padding: "6px 14px",
        borderLeft: active ? "2px solid var(--accent-color)" : "2px solid transparent",
        background: active ? "var(--paper)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
      }}
    >
      <span style={{ color: active ? "var(--accent-2)" : "var(--ink-4)" }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>{count}</span>
      )}
    </button>
  );
}

export function Sidebar() {
  const { activeCollectionId, setActiveCollection } = useAppStore();
  const collections = useQuery(api.collections.list) ?? [];
  const allTags = useQuery(api.highlights.allTags) ?? [];
  const allHighlights = useQuery(api.highlights.list, {}) ?? [];

  const createCollection = useMutation(api.collections.create);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const inboxCount = allHighlights.filter((h) => !h.collectionId).length;
  const notesCount = allHighlights.filter((h) => h.note && h.note.trim()).length;

  async function handleCreateCollection() {
    if (!newName.trim()) return;
    try {
      await createCollection({ name: newName.trim() });
      toast.success("Collection created");
      setDialogOpen(false);
      setNewName("");
    } catch {
      toast.error("Failed to create collection");
    }
  }

  return (
    <>
      <div
        className="flex flex-col overflow-hidden"
        data-testid="sidebar"
        style={{ width: 240, background: "var(--paper-2)", borderRight: "1px solid var(--rule)" }}
      >
        {/* New collection button */}
        <div className="p-2.5">
          <Button
            onClick={() => setDialogOpen(true)}
            data-testid="new-collection-button"
            className="w-full gap-1.5 text-xs font-medium"
            style={{ height: 32, background: "var(--ink)", color: "var(--paper)", borderRadius: 8 }}
          >
            <Plus size={12} /> New collection
          </Button>
        </div>

        <SectionLabel label="Library" />
        <NavItem icon={<Highlighter size={13} />} label="Inbox" count={inboxCount || undefined} active={activeCollectionId === "inbox"} onClick={() => setActiveCollection("inbox")} testId="library-inbox" />
        <NavItem icon={<BookOpen size={13} />} label="All highlights" count={allHighlights.length || undefined} active={activeCollectionId === "all"} onClick={() => setActiveCollection("all")} testId="library-all-highlights" />
        <NavItem icon={<StickyNote size={13} />} label="With notes" count={notesCount || undefined} active={activeCollectionId === "notes"} onClick={() => setActiveCollection("notes")} testId="library-notes" />
        <NavItem icon={<RefreshCw size={13} />} label="Review" active={activeCollectionId === "review"} onClick={() => setActiveCollection("review")} testId="library-review" />

        {collections.length > 0 && (
          <>
            <SectionLabel label="Collections" />
            {collections.map((col) => (
              <NavItem
                key={col._id}
                icon={<Folder size={13} />}
                label={col.name}
                count={allHighlights.filter((h) => h.collectionId === col._id).length || undefined}
                active={activeCollectionId === col._id}
                onClick={() => setActiveCollection(col._id)}
                testId={`collection-item-${col._id}`}
              />
            ))}
          </>
        )}

        {allTags.length > 0 && (
          <>
            <SectionLabel label="Tags" />
            <div className="px-3.5 pb-3 flex flex-wrap gap-1">
              {allTags.slice(0, 12).map(({ tag, count }) => (
                <span
                  key={tag}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", padding: "2px 6px", borderRadius: 3, background: "var(--paper)", border: "1px solid var(--rule)" }}
                >
                  #{tag} <span style={{ color: "var(--ink-4)" }}>{count}</span>
                </span>
              ))}
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* Sync status */}
        <div
          className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs"
          style={{ borderTop: "1px solid var(--rule)", color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(70% 0.14 145)" }} />
          Synced
        </div>
      </div>

      {/* New collection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="new-collection-dialog" style={{ maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>New collection</DialogTitle>
          </DialogHeader>
          <Input
            data-testid="new-collection-input"
            placeholder="e.g. Attention economy"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCreateCollection()}
            autoFocus
            style={{ marginTop: 4 }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button data-testid="create-collection-submit" onClick={() => void handleCreateCollection()} className="text-xs" style={{ background: "var(--ink)", color: "var(--paper)" }}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
