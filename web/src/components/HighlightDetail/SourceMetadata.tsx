import { sourceUrl, type DetailHighlight } from "./lib";

export function SourceMetadata({ highlight }: { highlight: DetailHighlight }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--ink-4)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 12,
      }}
    >
      {highlight.title}
      {highlight.author ? `  ·  ${highlight.author}` : ""}
      <a
        href={sourceUrl(highlight)}
        target="_blank"
        rel="noreferrer"
        className="ml-2 hover:underline"
        style={{ color: "var(--accent-color)" }}
      >
        ↗
      </a>
    </div>
  );
}
