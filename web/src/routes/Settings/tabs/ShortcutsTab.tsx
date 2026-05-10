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
      <h1 className="mb-2 font-display text-3xl font-semibold">Shortcuts</h1>
      <p className="mb-8 text-sm leading-6 text-ink-3">
        These shortcuts are active in the dashboard. Number keys also work in
        the extension selection toolbar.
      </p>
      {SHORTCUTS.map(([label, key]) => (
        <div
          key={label}
          className="flex h-11 items-center border-b border-rule text-sm"
        >
          <span className="flex-1">{label}</span>
          <kbd className="rounded border border-rule-2 px-2 py-1 font-mono text-xs text-ink-3">
            {key}
          </kbd>
        </div>
      ))}
    </>
  );
}
