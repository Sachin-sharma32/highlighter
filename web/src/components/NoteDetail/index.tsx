import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SerializedEditorState } from "lexical";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { Editor } from "@/components/editor/editor";
import { firstLineFromContent } from "@/lib/noteContent";

type DetailNote = {
  _id: Id<"notes">;
  title: string;
  content: string;
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
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const initialSerialized = parseSerialized(note.content);

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden bg-paper"
      data-testid="note-detail"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-rule px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
          {savedAt ? "Saved" : "Editing"}
        </span>
        <button
          onClick={() => void handleDelete()}
          title="Delete note"
          className="flex h-7 w-7 items-center justify-center rounded text-ink-4 hover:bg-paper-2 hover:text-red-500"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          key={note._id}
          editorSerializedState={initialSerialized}
          onSerializedChange={scheduleContentSave}
        />
      </div>
    </div>
  );
}
