import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Id } from "../../../../convex/_generated/dataModel";

export function NoteEditor({
  highlightId,
  initialNote,
  onSave,
}: {
  highlightId: Id<"highlights">;
  initialNote: string;
  onSave: (args: { id: Id<"highlights">; note: string }) => Promise<unknown>;
}) {
  const [note, setNote] = useState(initialNote);

  async function handleBlur() {
    await onSave({ id: highlightId, note });
    toast.success("Note saved");
  }

  return (
    <Textarea
      data-testid="highlight-note-input"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => void handleBlur()}
      placeholder="Add a note…"
      rows={4}
      className="resize-y rounded-lg border border-rule border-l-2 border-l-accent bg-paper-2 px-4 py-3.5 font-mono text-sm leading-[1.55] text-ink-2"
    />
  );
}
