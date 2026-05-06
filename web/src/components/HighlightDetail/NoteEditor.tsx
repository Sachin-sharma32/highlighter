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
      style={{
        padding: "14px 16px",
        border: "1px solid var(--rule)",
        borderLeft: "2px solid var(--accent-color)",
        borderRadius: 8,
        background: "var(--paper-2)",
        fontSize: 14,
        lineHeight: 1.55,
        color: "var(--ink-2)",
        fontFamily: "var(--font-mono)",
        resize: "vertical",
      }}
    />
  );
}
