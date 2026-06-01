import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  Folder,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SerializedEditorState } from "lexical";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { Editor } from "@/components/editor/editor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

const Whiteboard = lazy(() => import("./Whiteboard"));

type NoteType = "note" | "whiteboard";

type DetailNote = {
  _id: Id<"notes">;
  title: string;
  content: string;
  type?: NoteType;
  collectionId?: Id<"collections">;
  updatedAt: number;
};

type Collection = {
  _id: Id<"collections">;
  name: string;
};

const SAVE_DEBOUNCE_MS = 600;

function parseSerialized(raw: string): SerializedEditorState | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SerializedEditorState;
  } catch {
    return undefined;
  }
}

export function NoteDetail() {
  const { selectedNoteId, setSelectedNote } = useAppStore();
  const note = useQuery(
    api.notes.byId,
    selectedNoteId ? { id: selectedNoteId } : "skip",
  ) as DetailNote | null | undefined;
  const update = useMutation(api.notes.update);
  const setCollection = useMutation(api.notes.setCollection);
  const remove = useMutation(api.notes.remove);
  const collections = (useQuery(api.collections.list) ?? []) as Collection[];

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWhiteboard = note?.type === "whiteboard";
  const fallbackTitle = isWhiteboard ? "Untitled whiteboard" : "Untitled note";
  const currentCollection = collections.find(
    (c) => c._id === note?.collectionId,
  );

  useEffect(() => {
    if (!note) return;
    setTitleDraft(note.title);
    // Only reset the draft when switching notes; title edits are debounced locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?._id]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isWhiteboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        )
          return;
      }
      // Capture phase + stopPropagation so tldraw's own "f" (Frame tool)
      // shortcut never fires.
      e.preventDefault();
      e.stopPropagation();
      setIsFullscreen((v) => !v);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [isWhiteboard]);

  useEffect(() => {
    if (!isWhiteboard) setIsFullscreen(false);
  }, [isWhiteboard, selectedNoteId]);

  const handleTitleChange = useCallback(
    (next: string) => {
      setTitleDraft(next);
      if (!note) return;
      if (titleTimer.current) clearTimeout(titleTimer.current);
      const noteId = note._id;
      const fallback =
        note.type === "whiteboard" ? "Untitled whiteboard" : "Untitled note";
      titleTimer.current = setTimeout(async () => {
        try {
          await update({
            id: noteId,
            title: next.trim() || fallback,
          });
          setSavedAt(Date.now());
        } catch (err) {
          toast.error(
            friendlyErrorMessage(err, "Couldn’t save title. Please try again."),
          );
        }
      }, 500);
    },
    [note, update],
  );

  const handleCollectionChange = useCallback(
    async (value: string) => {
      if (!note) return;
      setCollectionOpen(false);
      try {
        await setCollection({
          id: note._id,
          collectionId:
            value === "none" ? undefined : (value as Id<"collections">),
        });
        toast.success(
          value === "none" ? "Removed from collection" : "Added to collection",
        );
      } catch (err) {
        toast.error(
          friendlyErrorMessage(
            err,
            "Couldn’t change the collection. Please try again.",
          ),
        );
      }
    },
    [note, setCollection],
  );

  const handleWhiteboardChange = useCallback(
    (serialized: string) => {
      if (!note) return;
      void (async () => {
        try {
          await update({ id: note._id, content: serialized });
          setSavedAt(Date.now());
        } catch (err) {
          toast.error(
            friendlyErrorMessage(
              err,
              "Couldn’t save whiteboard. Please try again.",
            ),
          );
        }
      })();
    },
    [note, update],
  );

  if (!selectedNoteId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p data-testid="note-detail-empty" className="text-[13px] text-ink-4">
          Select a note to edit it here
        </p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-[13px] text-ink-4">Loading…</p>
      </div>
    );
  }

  function scheduleContentSave(serialized: SerializedEditorState) {
    if (contentTimer.current) clearTimeout(contentTimer.current);
    const content = JSON.stringify(serialized);
    contentTimer.current = setTimeout(async () => {
      try {
        await update({ id: note!._id, content });
        setSavedAt(Date.now());
      } catch (err) {
        toast.error(
          friendlyErrorMessage(err, "Couldn’t save note. Please try again."),
        );
      }
    }, SAVE_DEBOUNCE_MS);
  }

  async function handleDelete() {
    try {
      await remove({ id: note!._id });
      setSelectedNote(null);
      toast.success(isWhiteboard ? "Whiteboard deleted" : "Note deleted");
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          isWhiteboard
            ? "We couldn’t delete that whiteboard. Please try again."
            : "We couldn’t delete that note. Please try again.",
        ),
      );
    }
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper"
          : "flex flex-1 flex-col overflow-hidden bg-paper"
      }
      data-testid="note-detail"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-rule px-4 py-2">
        <input
          data-testid={
            isWhiteboard ? "whiteboard-title-input" : "note-title-input"
          }
          value={titleDraft}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={fallbackTitle}
          className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 font-display text-sm font-medium text-ink outline-none placeholder:text-ink-4 focus:outline-none"
        />
        <Popover open={collectionOpen} onOpenChange={setCollectionOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="note-collection-trigger"
              className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border border-rule bg-paper-2 px-2 text-[11px] text-ink-2 hover:border-ink-4"
            >
              <Folder size={10} className="text-ink-4" />
              <span className="max-w-[140px] truncate">
                {currentCollection?.name ?? "No collection"}
              </span>
              <ChevronDown size={10} className="text-ink-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <button
              type="button"
              onClick={() => void handleCollectionChange("none")}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-paper-2",
                !note.collectionId && "font-medium text-ink",
              )}
            >
              <Folder size={11} className="text-ink-4" /> No collection
            </button>
            {collections.map((collection) => (
              <button
                key={collection._id}
                type="button"
                onClick={() => void handleCollectionChange(collection._id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-paper-2",
                  note.collectionId === collection._id &&
                    "font-medium text-ink",
                )}
              >
                <Folder size={11} className="text-ink-4" />{" "}
                <span className="truncate">{collection.name}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
          {savedAt ? "Saved" : isWhiteboard ? "Whiteboard" : "Editing"}
        </span>
        <div className="flex items-center gap-1">
          {isWhiteboard && (
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              title={
                isFullscreen ? "Exit fullscreen (Esc / F)" : "Fullscreen (F)"
              }
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="flex h-7 w-7 items-center justify-center rounded text-ink-4 hover:bg-paper-2 hover:text-ink"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          <button
            onClick={() => setDeleteDialogOpen(true)}
            title={isWhiteboard ? "Delete whiteboard" : "Delete note"}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-4 hover:bg-paper-2 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        title={isWhiteboard ? "Delete whiteboard?" : "Delete note?"}
        description={`This ${isWhiteboard ? "whiteboard" : "note"} will be permanently deleted.`}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => void handleDelete()}
      />
      <div className="flex-1 overflow-hidden">
        {isWhiteboard ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-[13px] text-ink-4">
                Loading whiteboard…
              </div>
            }
          >
            <Whiteboard
              key={note._id}
              initialContent={note.content}
              onChange={handleWhiteboardChange}
            />
          </Suspense>
        ) : (
          <Editor
            key={note._id}
            editorSerializedState={parseSerialized(note.content)}
            onSerializedChange={scheduleContentSave}
          />
        )}
      </div>
    </div>
  );
}
