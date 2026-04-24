import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { ChevronLeft, ChevronRight, Copy, Share2, Link, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = typeof COLORS[number];

type DetailHighlight = {
  _id: Id<"highlights">;
  title: string;
  author?: string;
  url: string;
  text: string;
  color: HighlightColor;
  note?: string;
  tags: string[];
};

const HL_COLORS: Record<HighlightColor, string> = {
  amber: "var(--hl-amber)",
  rose: "var(--hl-rose)",
  sage: "var(--hl-sage)",
  sky: "var(--hl-sky)",
  violet: "var(--hl-violet)",
};

function IconBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-md transition-colors"
      style={{ width: 28, height: 28, color: "var(--ink-3)" }}
    >
      {children}
    </button>
  );
}

function NoteEditor({
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
        fontStyle: "italic",
        resize: "vertical",
      }}
    />
  );
}

export function HighlightDetail() {
  const { selectedHighlightId, setSelectedHighlight } = useAppStore();
  const highlight = useQuery(
    api.highlights.byId,
    selectedHighlightId ? { id: selectedHighlightId } : "skip"
  ) as DetailHighlight | null | undefined;
  const setNote = useMutation(api.highlights.setNote);
  const setColor = useMutation(api.highlights.setColor);
  const update = useMutation(api.highlights.update);
  const remove = useMutation(api.highlights.remove);

  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  if (!selectedHighlightId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p data-testid="highlight-detail-empty" style={{ fontSize: 13, color: "var(--ink-4)" }}>Select a highlight to read it here</p>
      </div>
    );
  }

  if (!highlight) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p data-testid="highlight-detail-loading" style={{ fontSize: 13, color: "var(--ink-4)" }}>Loading…</p>
      </div>
    );
  }

  async function handleColorChange(color: HighlightColor) {
    if (!highlight) return;
    await setColor({ id: highlight._id, color });
  }

  async function handleAddTag() {
    if (!highlight || !newTag.trim()) return;
    const tag = newTag.trim().replace(/^#/, "");
    if (highlight.tags.includes(tag)) { setNewTag(""); setAddingTag(false); return; }
    await update({ id: highlight._id, tags: [...highlight.tags, tag] });
    setNewTag("");
    setAddingTag(false);
  }

  async function handleRemoveTag(tag: string) {
    if (!highlight) return;
    await update({ id: highlight._id, tags: highlight.tags.filter((t: string) => t !== tag) });
  }

  async function handleDelete() {
    if (!highlight) return;
    await remove({ id: highlight._id });
    setSelectedHighlight(null);
    toast.success("Highlight deleted");
  }

  function handleCopy() {
    void navigator.clipboard.writeText(highlight!.text);
    toast.success("Copied to clipboard");
  }

  const hlClass = `h ${highlight.color !== "amber" ? highlight.color : ""}`.trim();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="highlight-detail" style={{ background: "var(--paper)" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-5 shrink-0" style={{ height: 44, borderBottom: "1px solid var(--rule)" }}>
        <IconBtn onClick={() => setSelectedHighlight(null)}><ChevronLeft size={13} /></IconBtn>
        <IconBtn><ChevronRight size={13} /></IconBtn>
        <div className="flex-1" />
        <IconBtn onClick={handleCopy}><Copy size={13} /></IconBtn>
        <IconBtn><Share2 size={13} /></IconBtn>
        <IconBtn><Link size={13} /></IconBtn>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-md" style={{ width: 28, height: 28, color: "var(--ink-3)" }}>
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => void handleDelete()}
              className="gap-2 text-xs cursor-pointer text-red-600"
            >
              <Trash2 size={12} /> Delete highlight
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto noscroll px-14 py-10">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {/* Source metadata */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            {highlight.title}{highlight.author ? `  ·  ${highlight.author}` : ""}
            <a
              href={highlight.url}
              target="_blank"
              rel="noreferrer"
              className="ml-2 hover:underline"
              style={{ color: "var(--accent-color)" }}
            >
              ↗
            </a>
          </div>

          {/* Highlight text as blockquote */}
          <blockquote
            data-testid="highlight-detail-quote"
            style={{
              margin: 0,
              padding: "28px 0",
              fontFamily: "var(--font-display)",
              fontSize: 24,
              lineHeight: 1.38,
              letterSpacing: "-0.015em",
              color: "var(--ink)",
              borderTop: "1px solid var(--rule)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <span className={hlClass}>{highlight.text}</span>
          </blockquote>

          {/* Color swatches */}
          <div className="flex gap-2 mt-5 items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => void handleColorChange(c)}
                data-testid={`highlight-color-${c}`}
                className="rounded transition-transform hover:scale-110"
                title={c}
                style={{
                  width: 20,
                  height: 20,
                  background: HL_COLORS[c],
                  border: highlight.color === c ? "2px solid var(--ink)" : "2px solid transparent",
                  borderRadius: 4,
                }}
              />
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-5">
            {highlight.tags.map((tag: string) => (
              <span
                key={tag}
                className="flex items-center gap-1"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 8px", borderRadius: 999, fontSize: 11, background: "var(--paper-2)", border: "1px solid var(--rule)", color: "var(--ink-2)" }}
              >
                #{tag}
                <button onClick={() => void handleRemoveTag(tag)} className="hover:text-red-500 ml-0.5" style={{ color: "var(--ink-4)", lineHeight: 1 }}>×</button>
              </span>
            ))}
            {addingTag ? (
              <input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddTag();
                  if (e.key === "Escape") { setAddingTag(false); setNewTag(""); }
                }}
                onBlur={() => { if (newTag) void handleAddTag(); else setAddingTag(false); }}
                placeholder="tag name"
                style={{ height: 22, padding: "0 8px", borderRadius: 999, fontSize: 11, border: "1px solid var(--accent-color)", outline: "none", background: "var(--accent-tint)", width: 90 }}
              />
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="flex items-center gap-1"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 8px", borderRadius: 999, fontSize: 11, border: "1px dashed var(--rule-2)", color: "var(--ink-4)" }}
              >
                <Plus size={10} /> tag
              </button>
            )}
          </div>

          {/* Note */}
          <div className="mt-7">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Your note
            </div>
            <NoteEditor
              key={highlight._id}
              highlightId={highlight._id}
              initialNote={highlight.note ?? ""}
              onSave={setNote}
            />
          </div>

          {/* Related in your library — placeholder */}
          <div className="mt-7 p-4 rounded-lg" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent-2)" }}>
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.8 7 18.2l1.9-5.8L4 8.8h6.1L12 3z"/>
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Related in your library
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
              AI-powered related highlights coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
