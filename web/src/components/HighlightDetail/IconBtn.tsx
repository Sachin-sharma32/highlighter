import { cn } from "@/lib/utils";

export function IconBtn({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        disabled
          ? "cursor-default text-ink-4 opacity-40"
          : "cursor-pointer text-ink-3",
      )}
    >
      {children}
    </button>
  );
}
