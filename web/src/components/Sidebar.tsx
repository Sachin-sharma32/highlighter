import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Highlighter,
  BookOpen,
  StickyNote,
  NotebookPen,
  Folder,
  MoreHorizontal,
  Plus,
  Globe,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { friendlyErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

type SidebarCollection = {
  _id: Id<"collections">;
  name: string;
};

type SidebarHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  note?: string;
  url: string;
};

type SidebarTag = {
  tag: string;
  count: number;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3.5 pb-1.5 pt-3.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
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
      className={`flex w-full items-center gap-2.5 border-l-2 px-3.5 py-1.5 text-left text-[13px] transition-colors ${
        active
          ? "border-accent bg-paper font-medium text-ink"
          : "border-transparent text-ink-3"
      }`}
    >
      <span className={active ? "text-accent-2" : "text-ink-4"}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-ink-4">{count}</span>
      )}
    </button>
  );
}

function CollectionNavItem({
  collection,
  count,
  active,
  onSelect,
  onDelete,
}: {
  collection: SidebarCollection;
  count?: string | number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex w-full items-center border-l-2 transition-colors ${
        active
          ? "border-accent bg-paper font-medium text-ink"
          : "border-transparent text-ink-3"
      }`}
      data-testid={`collection-item-${collection._id}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-1.5 text-left text-[13px]"
      >
        <span className={active ? "text-accent-2" : "text-ink-4"}>
          <Folder size={13} />
        </span>
        <span className="flex-1 truncate">{collection.name}</span>
        {count !== undefined && (
          <span className="font-mono text-[10px] text-ink-4">{count}</span>
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Collection actions"
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-4 opacity-0 transition-opacity hover:bg-paper-2 hover:text-ink group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-red-600 focus:bg-white focus:text-red-600"
          >
            <Trash2 size={13} />
            Delete collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Sidebar() {
  const {
    activeCollectionId,
    activeTag,
    activeDomain,
    setActiveCollection,
    setActiveTag,
    setActiveDomain,
  } = useAppStore();
  const collections = (useQuery(api.collections.list) ??
    []) as SidebarCollection[];
  const allTags = (useQuery(api.highlights.allTags) ?? []) as SidebarTag[];
  const notesCountTotal = (useQuery(api.notes.list, {}) ?? []).length;
  const rawHighlights = useQuery(api.highlights.list, {});
  const allHighlights = useMemo(
    () => (rawHighlights ?? []) as SidebarHighlight[],
    [rawHighlights],
  );

  const createCollection = useMutation(api.collections.create);
  const removeCollection = useMutation(api.collections.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [domainsExpanded, setDomainsExpanded] = useState(false);
  const [pendingDeleteCollection, setPendingDeleteCollection] =
    useState<SidebarCollection | null>(null);

  const inboxCount = allHighlights.filter((h) => !h.collectionId).length;
  const notesCount = allHighlights.filter(
    (h) => h.note && h.note.trim(),
  ).length;

  // Compute domains
  const domains = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of allHighlights) {
      const d = hostnameOf(h.url);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count }));
  }, [allHighlights]);

  async function handleCreateCollection() {
    if (!newName.trim()) return;
    try {
      await createCollection({ name: newName.trim() });
      toast.success("Collection created");
      setDialogOpen(false);
      setNewName("");
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t create that collection. Please try again.",
        ),
      );
    }
  }

  async function handleDeleteCollection(collection: SidebarCollection) {
    try {
      await removeCollection({ id: collection._id });
      if (activeCollectionId === collection._id) setActiveCollection("inbox");
      toast.success("Collection deleted");
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t delete that collection. Please try again.",
        ),
      );
    }
  }

  return (
    <>
      <div
        className="flex w-60 flex-col overflow-hidden border-r border-rule bg-paper-2"
        data-testid="sidebar"
      >
        {/* New collection button */}
        <div className="p-2.5">
          <Button
            onClick={() => setDialogOpen(true)}
            data-testid="new-collection-button"
            className="w-full gap-1.5 rounded-lg bg-ink text-xs font-medium text-paper hover:bg-ink-2"
            size="sm"
          >
            <Plus size={12} /> New collection
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SectionLabel label="Library" />
          <NavItem
            icon={<Highlighter size={13} />}
            label="Inbox"
            count={inboxCount || undefined}
            active={activeCollectionId === "inbox" && !activeDomain}
            onClick={() => setActiveCollection("inbox")}
            testId="library-inbox"
          />
          <NavItem
            icon={<BookOpen size={13} />}
            label="All highlights"
            count={allHighlights.length || undefined}
            active={activeCollectionId === "all" && !activeDomain}
            onClick={() => setActiveCollection("all")}
            testId="library-all-highlights"
          />
          <NavItem
            icon={<StickyNote size={13} />}
            label="With notes"
            count={notesCount || undefined}
            active={activeCollectionId === "notes" && !activeDomain}
            onClick={() => setActiveCollection("notes")}
            testId="library-notes"
          />
          <NavItem
            icon={<NotebookPen size={13} />}
            label="Notes"
            count={notesCountTotal || undefined}
            active={activeCollectionId === "custom-notes" && !activeDomain}
            onClick={() => setActiveCollection("custom-notes")}
            testId="library-custom-notes"
          />
          {collections.length > 0 && (
            <>
              <SectionLabel label="Collections" />
              {collections.map((col) => (
                <CollectionNavItem
                  key={col._id}
                  collection={col}
                  count={
                    allHighlights.filter((h) => h.collectionId === col._id)
                      .length || undefined
                  }
                  active={activeCollectionId === col._id && !activeDomain}
                  onSelect={() => setActiveCollection(col._id)}
                  onDelete={() => setPendingDeleteCollection(col)}
                />
              ))}
            </>
          )}

          {/* Domains section — expandable */}
          {domains.length > 0 && (
            <>
              <button
                onClick={() => setDomainsExpanded(!domainsExpanded)}
                className="flex w-full items-center gap-1 px-3.5 pb-1.5 pt-3.5 text-left font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4"
              >
                {domainsExpanded ? (
                  <ChevronDown size={10} />
                ) : (
                  <ChevronRight size={10} />
                )}
                Domains ({domains.length})
              </button>
              {domainsExpanded &&
                domains.map(({ domain, count }) => (
                  <NavItem
                    key={domain}
                    icon={<Globe size={13} />}
                    label={domain}
                    count={count}
                    active={activeDomain === domain}
                    onClick={() => setActiveDomain(domain)}
                    testId={`domain-item-${domain}`}
                  />
                ))}
            </>
          )}

          {allTags.length > 0 && (
            <>
              <SectionLabel label="Tags" />
              <div className="flex flex-wrap gap-1 px-3.5 pb-3">
                {allTags.slice(0, 12).map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`cursor-pointer rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] ${
                      activeTag === tag
                        ? "border-accent bg-accent-tint text-ink"
                        : "border-rule bg-paper text-ink-3"
                    }`}
                  >
                    #{tag} <span className="text-ink-4">{count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-1.5 border-t border-rule px-3.5 py-2.5 font-mono text-xs text-ink-4">
          <span className="size-1.5 rounded-full bg-hl-sage" />
          Synced
        </div>
      </div>

      {/* New collection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-testid="new-collection-dialog"
          className="max-w-[400px]"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              New collection
            </DialogTitle>
          </DialogHeader>
          <Input
            data-testid="new-collection-input"
            placeholder="e.g. Attention economy"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && void handleCreateCollection()
            }
            autoFocus
            className="mt-1"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              data-testid="create-collection-submit"
              onClick={() => void handleCreateCollection()}
              className="bg-ink text-xs text-paper"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(pendingDeleteCollection)}
        title="Delete collection?"
        description={`Highlights in ${pendingDeleteCollection?.name ?? "this collection"} will move back to Inbox. The highlights themselves will not be deleted.`}
        confirmLabel="Delete collection"
        onOpenChange={(open) => !open && setPendingDeleteCollection(null)}
        onConfirm={async () => {
          if (!pendingDeleteCollection) return;
          await handleDeleteCollection(pendingDeleteCollection);
          setPendingDeleteCollection(null);
        }}
      />
    </>
  );
}
