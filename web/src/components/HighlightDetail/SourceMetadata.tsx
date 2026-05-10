import { sourceUrl, type DetailHighlight } from "./lib";

export function SourceMetadata({ highlight }: { highlight: DetailHighlight }) {
  return (
    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
      {highlight.title}
      {highlight.author ? `  ·  ${highlight.author}` : ""}
      <a
        href={sourceUrl(highlight)}
        target="_blank"
        rel="noreferrer"
        className="ml-2 text-accent hover:underline"
      >
        ↗
      </a>
    </div>
  );
}
