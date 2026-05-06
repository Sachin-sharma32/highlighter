import { Sparkles } from "lucide-react";

export function AITab() {
  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        AI & summaries
      </h1>
      <div
        className="mt-8 rounded-lg border p-5"
        style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={15} style={{ color: "var(--accent-2)" }} />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--accent-2)" }}
          >
            Coming soon
          </span>
        </div>
        <p className="text-sm leading-6" style={{ color: "var(--ink-3)" }}>
          AI summaries will turn groups of highlights into review notes and help
          answer questions from your library.
        </p>
      </div>
    </>
  );
}
