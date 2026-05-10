import { Sparkles } from "lucide-react";

export function AITab() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold">
        AI & summaries
      </h1>
      <div className="mt-8 rounded-lg border border-rule bg-paper-2 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={15} className="text-accent-2" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent-2">
            Coming soon
          </span>
        </div>
        <p className="text-sm leading-6 text-ink-3">
          AI summaries will turn groups of highlights into review notes and help
          answer questions from your library.
        </p>
      </div>
    </>
  );
}
