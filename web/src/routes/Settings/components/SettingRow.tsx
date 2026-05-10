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
    <div className="flex items-center gap-4 rounded-lg border border-rule bg-paper-2 p-4">
      <span className="text-ink-3">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs leading-5 text-ink-3">{description}</div>
      </div>
      {children}
    </div>
  );
}
