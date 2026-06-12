export function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="animate-fade-up px-6 py-[48px] text-center text-xs leading-6 text-ink-4">
      {/* A page in miniature, with one marked line */}
      <div
        aria-hidden
        className="mx-auto mb-4 w-28 space-y-2 rounded-lg border border-rule bg-paper-2 p-3 shadow-paper-1"
      >
        <div className="h-1.5 w-full rounded-full bg-paper-3" />
        <div className="h-1.5 w-4/5 rounded-full bg-paper-3" />
        <div className="h-1.5 w-11/12 rounded-full bg-hl-amber" />
        <div className="h-1.5 w-3/5 rounded-full bg-paper-3" />
      </div>
      <p className="mb-1 font-display text-[13px] text-ink-3">{text}</p>
      {sub && <p>{sub}</p>}
    </div>
  );
}
