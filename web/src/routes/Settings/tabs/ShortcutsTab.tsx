const SHORTCUTS: Array<[string, string]> = [
  ["Open search", "Cmd/Ctrl K"],
  ["Next highlight", "J"],
  ["Previous highlight", "K"],
  ["Copy quote", "C"],
  ["Set highlight color", "1-5"],
];

export function ShortcutsTab() {
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
        Shortcuts
      </h1>
      <p className="mb-8 text-sm leading-6" style={{ color: "var(--ink-3)" }}>
        These shortcuts are active in the dashboard. Number keys also work in
        the extension selection toolbar.
      </p>
      {SHORTCUTS.map(([label, key]) => (
        <div
          key={label}
          className="flex h-11 items-center border-b text-sm"
          style={{ borderColor: "var(--rule)" }}
        >
          <span className="flex-1">{label}</span>
          <kbd
            className="rounded border px-2 py-1 font-mono text-xs"
            style={{
              borderColor: "var(--rule-2)",
              color: "var(--ink-3)",
            }}
          >
            {key}
          </kbd>
        </div>
      ))}
    </>
  );
}
