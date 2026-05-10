import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ColorSetting } from "../lib";

export function AddColorForm({
  existingCount,
  onCancel,
  onAdd,
}: {
  existingCount: number;
  onCancel: () => void;
  onAdd: (color: ColorSetting) => void;
}) {
  const [hue, setHue] = useState(45);
  const [saturation, setSaturation] = useState(92);
  const [lightness, setLightness] = useState(74);
  const [name, setName] = useState("New color");
  const value = `hsl(${hue} ${saturation}% ${lightness}%)`;
  const previewTextColor = lightness > 58 ? "#111827" : "#ffffff";

  function handleAdd() {
    const label = name.trim() || "New color";
    onAdd({
      id: `custom-${Date.now()}`,
      label,
      value,
      shortcut: existingCount < 9 ? existingCount + 1 : undefined,
      isDefault: false,
    });
  }

  const sliders: Array<
    [string, number, number, number, (next: number) => void, string]
  > = [
    [
      "Hue",
      hue,
      0,
      360,
      setHue,
      "linear-gradient(90deg, #f87171, #facc15, #4ade80, #38bdf8, #a78bfa, #f87171)",
    ],
    [
      "Saturation",
      saturation,
      20,
      100,
      setSaturation,
      `linear-gradient(90deg, hsl(${hue} 20% ${lightness}%), hsl(${hue} 100% ${lightness}%))`,
    ],
    [
      "Lightness",
      lightness,
      35,
      86,
      setLightness,
      `linear-gradient(90deg, hsl(${hue} ${saturation}% 35%), hsl(${hue} ${saturation}% 86%))`,
    ],
  ];

  return (
    <div className="mt-4 rounded-lg border border-rule bg-paper-2 p-4">
      <div className="mb-4 flex items-center gap-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 flex-1 rounded border border-rule bg-transparent px-2 text-sm outline-none"
        />
        <span
          className="flex h-9 w-28 items-center justify-center rounded font-mono text-[10px]"
          style={{ background: value, color: previewTextColor }}
        >
          Aa readable
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {sliders.map(([label, current, min, max, setter, background]) => (
          <label
            key={label}
            className="grid grid-cols-[76px_1fr_36px] items-center gap-3 text-xs text-ink-3"
          >
            <span className="font-mono">{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              value={current}
              onChange={(event) => setter(Number(event.target.value))}
              className="h-2 cursor-pointer appearance-none rounded-full"
              style={{ background }}
            />
            <span className="font-mono text-[10px]">{current}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" className="h-8 text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="h-8 text-xs" onClick={handleAdd}>
          Add color
        </Button>
      </div>
    </div>
  );
}
