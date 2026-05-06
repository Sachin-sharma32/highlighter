export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative rounded-full transition-colors"
      style={{
        width: 34,
        height: 20,
        background: checked ? "var(--accent-color)" : "var(--rule-2)",
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-transform"
        style={{
          width: 16,
          height: 16,
          left: 2,
          transform: checked ? "translateX(14px)" : "translateX(0)",
        }}
      />
    </button>
  );
}
