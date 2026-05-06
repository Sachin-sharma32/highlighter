export function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="px-6 py-[60px] text-center text-xs leading-6 text-ink-4">
      <p className="mb-1">{text}</p>
      {sub && <p>{sub}</p>}
    </div>
  );
}
