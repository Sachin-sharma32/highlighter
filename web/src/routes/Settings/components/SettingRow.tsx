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
    <div className="flex flex-col gap-3 rounded-lg border border-rule bg-paper-2 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
        <span className="shrink-0 text-ink-3">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink">{title}</div>
          <div className="text-xs leading-5 text-ink-3">{description}</div>
        </div>
      </div>
      <div className="shrink-0 pl-9 sm:pl-0">{children}</div>
    </div>
  );
}
