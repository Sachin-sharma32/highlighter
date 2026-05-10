export function RelatedSection() {
  return (
    <div className="mt-7 rounded-lg border border-rule bg-paper-2 p-4">
      <div className="mb-2 flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent-2"
        >
          <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.8 7 18.2l1.9-5.8L4 8.8h6.1L12 3z" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent-2">
          Related in your library
        </span>
      </div>
      <p className="text-xs text-ink-4">
        AI-powered related highlights coming soon.
      </p>
    </div>
  );
}
