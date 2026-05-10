import { cn } from "@/lib/utils";

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
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-paper text-ink shadow-paper-1"
          : "bg-transparent text-ink-3",
      )}
    >
      <span className={active ? "text-accent-2" : "text-ink-4"}>{icon}</span>
      {label}
    </button>
  );
}
