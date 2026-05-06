export function RelatedSection() {
  return (
    <div
      className="mt-7 p-4 rounded-lg"
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--accent-2)" }}
        >
          <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.8 7 18.2l1.9-5.8L4 8.8h6.1L12 3z" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--accent-2)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Related in your library
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
        AI-powered related highlights coming soon.
      </p>
    </div>
  );
}
