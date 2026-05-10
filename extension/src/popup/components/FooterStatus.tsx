interface FooterStatusProps {
  error: string;
  message: string;
}

export function FooterStatus({ error, message }: FooterStatusProps) {
  if (!error && !message) return null;
  return (
    <div
      className={`border-t border-rule bg-paper px-3 py-1.5 text-[11px] leading-4 ${error ? "text-red-600" : "text-ink-3"}`}
    >
      {error || message}
    </div>
  );
}
