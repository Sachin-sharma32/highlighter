import { COLORS, HL_COLORS, type HighlightColor } from "./lib";

export function ColorSwatches({
  current,
  onChange,
}: {
  current: HighlightColor;
  onChange: (color: HighlightColor) => void;
}) {
  return (
    <div className="flex gap-2 mt-5 items-center">
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          data-testid={`highlight-color-${c}`}
          className="rounded transition-transform hover:scale-110"
          title={c}
          style={{
            width: 20,
            height: 20,
            background: HL_COLORS[c],
            border:
              current === c ? "2px solid var(--ink)" : "2px solid transparent",
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}
