type Shortcut = [label: string, keys: string];

const GROUPS: Array<{ title: string; items: Shortcut[] }> = [
  {
    title: "Dashboard",
    items: [
      ["Open search", "Cmd/Ctrl K"],
      ["Next highlight", "J"],
      ["Previous highlight", "K"],
      ["Copy quote", "C"],
      ["Set highlight color", "1-5"],
    ],
  },
  {
    title: "Whiteboard",
    items: [
      ["Toggle fullscreen", "F"],
      ["Exit fullscreen", "Esc"],
    ],
  },
];

export function ShortcutsTab() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold">Shortcuts</h1>
      <p className="mb-8 text-sm leading-6 text-ink-3">
        These shortcuts are active in the dashboard. Number keys also work in
        the extension selection toolbar.
      </p>
      {GROUPS.map((group) => (
        <div key={group.title} className="mb-8 last:mb-0">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
            {group.title}
          </h2>
          {group.items.map(([label, key]) => (
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
        </div>
      ))}
    </>
  );
}
