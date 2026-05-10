import { cn } from "@/lib/utils";
import { COLORS, HL_COLORS, type HighlightColor } from "./lib";

export function ColorSwatches({
  current,
  onChange,
}: {
  current: HighlightColor;
  onChange: (color: HighlightColor) => void;
}) {
  return (
    <div className="mt-5 flex items-center gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          data-testid={`highlight-color-${c}`}
          className={cn(
            "h-5 w-5 rounded-[4px] border-2 transition-transform hover:scale-110",
            current === c ? "border-ink" : "border-transparent",
          )}
          title={c}
          style={{ background: HL_COLORS[c] }}
        />
      ))}
    </div>
  );
}
