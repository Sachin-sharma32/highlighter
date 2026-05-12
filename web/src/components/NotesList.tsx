import { useQuery, useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { friendlyErrorMessage } from "@/lib/errors";
import { firstLineFromContent, previewFromContent } from "@/lib/noteContent";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

type ListNote = {
  _id: Id<"notes">;
  title: string;
  content: string;
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
  return firstLineFromContent(n.content) || "Untitled note";
}

function notePreview(n: ListNote) {
  const first = firstLineFromContent(n.content);
  const full = previewFromContent(n.content);
  if (!first) return "";
  // skip the title line in the preview body
  const rest = full.startsWith(first) ? full.slice(first.length).trim() : full;
  return rest.replace(/^·\s*/, "");
}

export function NotesList() {
  const { selectedNoteId, setSelectedNote, searchQuery } = useAppStore();
  const notes = (useQuery(api.notes.list, {
    search: searchQuery || undefined,
  }) ?? []) as ListNote[];

  const create = useMutation(api.notes.create);
  const remove = useMutation(api.notes.remove);

  async function handleCreate() {
    try {
      const id = await create({});
      setSelectedNote(id);
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t create that note. Please try again.",
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
      className="flex w-[360px] flex-col overflow-hidden border-r border-rule bg-paper"
      data-testid="notes-list"
    >
      <div className="border-b border-rule px-4 pb-2.5 pt-3.5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="m-0 font-display text-[22px] font-medium tracking-tight text-ink">
            Notes
          </h2>
          <button
            onClick={() => void handleCreate()}
            data-testid="new-note-button"
            title="New note"
            className="flex items-center gap-1 rounded-md border border-rule bg-paper-2 px-2 py-1 font-mono text-[10px] text-ink-3 hover:text-ink"
          >
            <Plus size={11} /> New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-[13px] text-ink-4">No notes yet.</p>
            <button
              onClick={() => void handleCreate()}
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
              className={`group flex w-full gap-2.5 border-b border-rule text-left transition-colors ${
                n._id === selectedNoteId
                  ? "border-l-2 border-l-accent bg-paper-2"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              <button
                onClick={() => setSelectedNote(n._id)}
                className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left"
              >
                <div className="flex justify-between gap-2">
                  <span className="truncate font-display text-sm font-medium text-ink">
                    {noteTitle(n)}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-4">
                    {timeAgo(n.updatedAt)}
                  </span>
                </div>
                <p className="overflow-hidden text-xs leading-snug text-ink-3 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {notePreview(n) || "Empty note"}
                </p>
              </button>
              <button
                onClick={() => void handleDelete(n._id)}
                title="Delete note"
                className="flex shrink-0 items-center justify-center rounded p-1 pr-3 text-ink-4 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
