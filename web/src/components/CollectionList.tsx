import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  FileText,
  PenLine,
  Plus,
  Scissors,
  StickyNote,
  Trash2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { previewFromContent } from "@/lib/noteContent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatClipTime } from "@/lib/youtube";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type NoteType = "note" | "whiteboard";

type ListHighlight = {
  _id: Id<"highlights">;
  collectionId?: Id<"collections">;
  title: string;
  text: string;
  color: string;
  note?: string;
  tags: string[];
  url: string;
  createdAt: number;
  sourceType?: "web" | "youtube";
  youtubeVideoId?: string;
  clipStart?: number;
  clipEnd?: number;
};

type ListNote = {
  _id: Id<"notes">;
  title: string;
  content: string;
  type?: NoteType;
  updatedAt: number;
};

type Collection = {
  _id: Id<"collections">;
  name: string;
};

const COLOR_BAR: Record<string, string> = {
  amber: "bg-hl-amber",
  rose: "bg-hl-rose",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
  violet: "bg-hl-violet",
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

function highlightDisplayText(h: ListHighlight) {
  if (h.sourceType === "youtube") {
    if (h.clipStart !== undefined && h.clipEnd !== undefined) {
      return `YouTube clip ${formatClipTime(h.clipStart)}-${formatClipTime(h.clipEnd)}`;
    }
    return "YouTube clip";
  }
  return h.text;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="border-b border-rule bg-paper-2 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
      {label}
    </div>
  );
}

export function CollectionList({
  mobileHidden = false,
}: {
  mobileHidden?: boolean;
}) {
  const {
    activeCollectionId,
    selectedHighlightId,
    selectedNoteId,
    lastSelectedKind,
    setSelectedHighlight,
    setSelectedNote,
    searchQuery,
  } = useAppStore();

  const collectionId = activeCollectionId as Id<"collections">;
  const collections = (useQuery(api.collections.list) ?? []) as Collection[];
  const collectionName =
    collections.find((c) => c._id === collectionId)?.name ?? "Collection";

  const highlights = (useQuery(api.highlights.list, {
    collectionId,
    search: searchQuery || undefined,
  }) ?? []) as ListHighlight[];
  const notes = (useQuery(api.notes.list, {
    collectionId,
    search: searchQuery || undefined,
  }) ?? []) as ListNote[];

  const removeHighlight = useMutation(api.highlights.remove);
  const removeNote = useMutation(api.notes.remove);
  const createNote = useMutation(api.notes.create);
  const [pendingDeleteHighlight, setPendingDeleteHighlight] =
    useState<Id<"highlights"> | null>(null);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<ListNote | null>(
    null,
  );

  async function handleDeleteHighlight(id: Id<"highlights">) {
    try {
      await removeHighlight({ id });
      if (selectedHighlightId === id) setSelectedHighlight(null);
      toast.success("Highlight deleted");
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t delete that highlight. Please try again.",
        ),
      );
    }
  }

  async function handleCreate(type: NoteType) {
    try {
      const id = await createNote({ type, collectionId });
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

  async function handleDeleteNote(id: Id<"notes">) {
    try {
      await removeNote({ id });
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

  const total = highlights.length + notes.length;

  return (
    <div
      className={`${mobileHidden ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col overflow-hidden border-r border-rule bg-paper md:w-[300px] lg:w-[340px] xl:w-[380px]`}
      data-testid="collection-list"
    >
      <div className="border-b border-rule px-4 pb-2.5 pt-3.5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[22px] font-medium tracking-tight text-ink">
            {collectionName}
          </h2>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-ink-4">{total}</span>
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
        {total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-[13px] text-ink-4">Nothing here yet.</p>
            <p className="text-xs text-ink-4">
              Assign highlights or notes to this collection to see them here.
            </p>
          </div>
        ) : (
          <>
            {highlights.length > 0 && <SectionLabel label="Highlights" />}
            {highlights.map((h) => {
              const isSelected =
                lastSelectedKind === "highlight" &&
                h._id === selectedHighlightId;
              return (
                <div
                  key={h._id}
                  data-testid="highlight-row"
                  data-highlight-id={h._id}
                  className={`group flex w-full gap-2.5 border-b border-rule text-left transition-colors ${
                    isSelected
                      ? "border-l-2 border-l-accent bg-paper-2"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <button
                    onClick={() => setSelectedHighlight(h._id)}
                    className="flex min-w-0 flex-1 gap-2.5 px-4 py-3 text-left"
                  >
                    <div
                      className={`w-[3px] shrink-0 rounded-sm ${COLOR_BAR[h.color] ?? COLOR_BAR.amber}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-3">
                          {h.sourceType === "youtube" && (
                            <Scissors
                              size={11}
                              className="shrink-0 text-accent"
                            />
                          )}
                          <span className="truncate">{h.title}</span>
                        </div>
                        <div className="shrink-0 font-mono text-[10px] text-ink-4">
                          {timeAgo(h.createdAt)}
                        </div>
                      </div>
                      <p className="overflow-hidden font-display text-sm leading-snug text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                        {highlightDisplayText(h)}
                      </p>
                      {h.note && (
                        <div className="mt-1 flex items-center gap-1 text-ink-4">
                          <StickyNote size={10} />
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setPendingDeleteHighlight(h._id)}
                    title="Delete highlight"
                    className="flex shrink-0 items-center justify-center rounded p-1 pr-3 text-ink-4 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}

            {notes.length > 0 && <SectionLabel label="Notes" />}
            {notes.map((n) => {
              const isSelected =
                lastSelectedKind === "note" && n._id === selectedNoteId;
              const title =
                n.title ||
                (n.type === "whiteboard"
                  ? "Untitled whiteboard"
                  : "Untitled note");
              const preview =
                n.type === "whiteboard"
                  ? "Whiteboard"
                  : previewFromContent(n.content) || "Empty note";
              return (
                <div
                  key={n._id}
                  data-testid="note-row"
                  data-note-id={n._id}
                  data-note-type={n.type ?? "note"}
                  className={`group flex w-full gap-2.5 border-b border-rule text-left transition-colors ${
                    isSelected
                      ? "border-l-2 border-l-accent bg-paper-2"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <button
                    onClick={() => setSelectedNote(n._id)}
                    className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {n.type === "whiteboard" ? (
                          <PenLine
                            size={12}
                            className="shrink-0 text-ink-4"
                            aria-hidden
                          />
                        ) : (
                          <FileText
                            size={12}
                            className="shrink-0 text-ink-4"
                            aria-hidden
                          />
                        )}
                        <span className="truncate font-display text-sm font-medium text-ink">
                          {title}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-4">
                        {timeAgo(n.updatedAt)}
                      </span>
                    </div>
                    <p className="overflow-hidden text-xs leading-snug text-ink-3 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {preview}
                    </p>
                  </button>
                  <button
                    onClick={() => setPendingDeleteNote(n)}
                    title="Delete note"
                    className="flex shrink-0 items-center justify-center rounded p-1 pr-3 text-ink-4 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      <ConfirmDeleteDialog
        open={Boolean(pendingDeleteHighlight)}
        title="Delete highlight?"
        description="This highlight and its note will be permanently deleted."
        onOpenChange={(open) => !open && setPendingDeleteHighlight(null)}
        onConfirm={async () => {
          if (!pendingDeleteHighlight) return;
          await handleDeleteHighlight(pendingDeleteHighlight);
          setPendingDeleteHighlight(null);
        }}
      />
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
          await handleDeleteNote(pendingDeleteNote._id);
          setPendingDeleteNote(null);
        }}
      />
    </div>
  );
}
