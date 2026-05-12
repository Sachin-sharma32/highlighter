import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { Maximize2, Minimize2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SerializedEditorState } from "lexical";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { Editor } from "@/components/editor/editor";
import { firstLineFromContent } from "@/lib/noteContent";

const Whiteboard = lazy(() => import("./Whiteboard"));

type NoteType = "note" | "whiteboard";

type DetailNote = {
  _id: Id<"notes">;
  title: string;
  content: string;
  type?: NoteType;
  updatedAt: number;
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
  const remove = useMutation(api.notes.remove);

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWhiteboard = note?.type === "whiteboard";

  useEffect(() => {
    if (!note) return;
    setTitleDraft(note.title);
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
      titleTimer.current = setTimeout(async () => {
        try {
          await update({
            id: noteId,
            title: next.trim() || "Untitled whiteboard",
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
    const title = firstLineFromContent(serialized) || "Untitled note";
    contentTimer.current = setTimeout(async () => {
      try {
        await update({ id: note!._id, content, title });
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
        {isWhiteboard ? (
          <input
            data-testid="whiteboard-title-input"
            value={titleDraft}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled whiteboard"
            className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 font-display text-sm font-medium text-ink outline-none placeholder:text-ink-4 focus:outline-none"
          />
        ) : (
          <span className="flex-1" />
        )}
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
            onClick={() => void handleDelete()}
            title={isWhiteboard ? "Delete whiteboard" : "Delete note"}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-4 hover:bg-paper-2 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
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
