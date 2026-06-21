import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  ArrowUpDown,
  Check,
  Plus,
  Star,
  Trash2,
  FileText,
  PenLine,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { previewFromContent } from "@/lib/noteContent";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type NoteType = "note" | "whiteboard";

type ListNote = {
  _id: Id<"notes">;
  title: string;
  content: string;
  type?: NoteType;
  starred?: boolean;
  createdAt: number;
  updatedAt: number;
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function noteTitle(n: ListNote) {
  if (n.type === "whiteboard") {
    return n.title || "Untitled whiteboard";
  }
  return n.title || "Untitled note";
}

function notePreview(n: ListNote) {
  if (n.type === "whiteboard") return "Whiteboard";
  return previewFromContent(n.content);
}

export function NotesList({
  mobileHidden = false,
}: {
  mobileHidden?: boolean;
}) {
  const {
    selectedNoteId,
    setSelectedNote,
    searchQuery,
    notesSort,
    setNotesSort,
  } = useAppStore();
  const notes = (useQuery(api.notes.list, {
    search: searchQuery || undefined,
    sort: notesSort,
  }) ?? []) as ListNote[];

  const create = useMutation(api.notes.create);
  const remove = useMutation(api.notes.remove);
  const setStarred = useMutation(api.notes.setStarred);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<ListNote | null>(
    null,
  );

  async function handleToggleStar(n: ListNote) {
    try {
      await setStarred({ id: n._id, starred: !n.starred });
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t update that note. Please try again.",
        ),
      );
    }
  }

  async function handleCreate(type: NoteType) {
    try {
      const id = await create({ type });
      setSelectedNote(id);
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          type === "whiteboard"
            ? "We couldn’t create that whiteboard. Please try again."
            : "We couldn’t create that note. Please try again.",
        ),
      );
    }
  }

  async function handleDelete(id: Id<"notes">) {
    try {
      await remove({ id });
      if (selectedNoteId === id) setSelectedNote(null);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t delete that note. Please try again.",
        ),
      );
    }
  }

  return (
    <div
      className={`${mobileHidden ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col overflow-hidden border-r border-rule bg-paper md:w-[300px] lg:w-[340px] xl:w-[380px]`}
      data-testid="notes-list"
    >
      <div className="border-b border-rule px-4 pb-2.5 pt-3.5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[22px] font-medium tracking-tight text-ink">
            Notes
          </h2>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                data-testid="notes-sort-button"
                title="Sort notes"
                className="flex items-center gap-1 rounded-md border border-rule bg-paper-2 px-2 py-1 font-mono text-[10px] text-ink-3 hover:text-ink"
              >
                <ArrowUpDown size={11} />
                {notesSort === "updated" ? "Edited" : "Created"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[150px]">
                <DropdownMenuItem onSelect={() => setNotesSort("created")}>
                  <Check
                    size={14}
                    className={cn(
                      "mr-2",
                      notesSort === "created" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Created time
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setNotesSort("updated")}>
                  <Check
                    size={14}
                    className={cn(
                      "mr-2",
                      notesSort === "updated" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Edited time
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                data-testid="new-note-button"
                title="New"
                className="flex items-center gap-1 rounded-md border border-rule bg-paper-2 px-2 py-1 font-mono text-[10px] text-ink-3 hover:text-ink"
              >
                <Plus size={11} /> New
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem
                  data-testid="new-note-option"
                  onSelect={() => void handleCreate("note")}
                >
                  <FileText size={14} className="mr-2" />
                  Note
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="new-whiteboard-option"
                  onSelect={() => void handleCreate("whiteboard")}
                >
                  <PenLine size={14} className="mr-2" />
                  Whiteboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-[13px] text-ink-4">No notes yet.</p>
            <button
              onClick={() => void handleCreate("note")}
              className="text-xs text-accent hover:underline"
            >
              Create your first note
            </button>
          </div>
        ) : (
          notes.map((n) => (
            <div
              key={n._id}
              data-testid="note-row"
              data-note-id={n._id}
              data-note-type={n.type ?? "note"}
              data-starred={n.starred ? "true" : undefined}
              className={cn(
                "group flex w-full gap-2.5 border-b border-rule text-left transition-colors",
                n._id === selectedNoteId
                  ? "border-l-2 border-l-accent bg-paper-2"
                  : n.starred
                    ? "border-l-2 border-l-transparent bg-accent-tint"
                    : "border-l-2 border-l-transparent",
              )}
            >
              <button
                onClick={() => setSelectedNote(n._id)}
                className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left"
              >
                <div className="flex justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {n.type === "whiteboard" && (
                      <PenLine
                        size={12}
                        className="shrink-0 text-ink-4"
                        aria-hidden
                      />
                    )}
                    <span className="truncate font-display text-sm font-medium text-ink">
                      {noteTitle(n)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 font-mono text-[10px] text-ink-4"
                    title={notesSort === "updated" ? "Last edited" : "Created"}
                  >
                    {timeAgo(
                      notesSort === "updated" ? n.updatedAt : n.createdAt,
                    )}
                  </span>
                </div>
                <p className="overflow-hidden text-xs leading-snug text-ink-3 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {notePreview(n) || "Empty note"}
                </p>
              </button>
              <div className="flex shrink-0 flex-col items-center gap-1 py-2 pr-2">
                <button
                  onClick={() => void handleToggleStar(n)}
                  title={n.starred ? "Unstar note" : "Star note"}
                  aria-pressed={n.starred ? true : false}
                  className={cn(
                    "flex items-center justify-center rounded p-1 transition-opacity hover:text-accent",
                    n.starred
                      ? "text-accent opacity-100"
                      : "text-ink-4 opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                  )}
                >
                  <Star
                    size={13}
                    className={n.starred ? "fill-current" : undefined}
                  />
                </button>
                <button
                  onClick={() => setPendingDeleteNote(n)}
                  title="Delete note"
                  className="flex items-center justify-center rounded p-1 text-ink-4 opacity-0 transition-opacity hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <ConfirmDeleteDialog
        open={Boolean(pendingDeleteNote)}
        title={
          pendingDeleteNote?.type === "whiteboard"
            ? "Delete whiteboard?"
            : "Delete note?"
        }
        description={`This ${pendingDeleteNote?.type === "whiteboard" ? "whiteboard" : "note"} will be permanently deleted.`}
        onOpenChange={(open) => !open && setPendingDeleteNote(null)}
        onConfirm={async () => {
          if (!pendingDeleteNote) return;
          await handleDelete(pendingDeleteNote._id);
          setPendingDeleteNote(null);
        }}
      />
    </div>
  );
}
