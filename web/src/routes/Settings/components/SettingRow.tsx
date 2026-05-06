export function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-lg border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
    >
      <span style={{ color: "var(--ink-3)" }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {title}
        </div>
        <div className="text-xs leading-5" style={{ color: "var(--ink-3)" }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  );
}
