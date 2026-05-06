export type TabId = "appearance" | "colors" | "shortcuts" | "ai" | "account";

export type ColorSetting = {
  id: string;
  label: string;
  value: string;
  shortcut?: number;
  isDefault: boolean;
};

export const DEFAULT_COLORS: ColorSetting[] = [
  {
    id: "amber",
    label: "Key idea",
    value: "var(--hl-amber)",
    shortcut: 1,
    isDefault: true,
  },
  {
    id: "rose",
    label: "Disagree",
    value: "var(--hl-rose)",
    shortcut: 2,
    isDefault: true,
  },
  {
    id: "sage",
    label: "Follow-up",
    value: "var(--hl-sage)",
    shortcut: 3,
    isDefault: true,
  },
  {
    id: "sky",
    label: "Reference",
    value: "var(--hl-sky)",
    shortcut: 4,
    isDefault: true,
  },
  {
    id: "violet",
    label: "Beautiful",
    value: "var(--hl-violet)",
    shortcut: 5,
    isDefault: true,
  },
];

export function readStoredJson<T>(key: string, fallback: T) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}
