export function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors"
      style={{
        background: active ? "var(--paper)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        boxShadow: active ? "var(--shadow-1)" : "none",
      }}
    >
      <span style={{ color: active ? "var(--accent-2)" : "var(--ink-4)" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
