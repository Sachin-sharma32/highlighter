import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  KeyRound,
  Link2,
  LogOut,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  Type,
  User,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  applyAppearanceSettings,
  type AppTheme,
  type TypographyChoice,
  TYPOGRAPHY_OPTIONS,
} from "@/lib/appearance";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TabId = "appearance" | "colors" | "shortcuts" | "ai" | "account";

type ColorSetting = {
  id: string;
  label: string;
  value: string;
  shortcut?: number;
  isDefault: boolean;
};

const DEFAULT_COLORS: ColorSetting[] = [
  { id: "amber", label: "Key idea", value: "var(--hl-amber)", shortcut: 1, isDefault: true },
  { id: "rose", label: "Disagree", value: "var(--hl-rose)", shortcut: 2, isDefault: true },
  { id: "sage", label: "Follow-up", value: "var(--hl-sage)", shortcut: 3, isDefault: true },
  { id: "sky", label: "Reference", value: "var(--hl-sky)", shortcut: 4, isDefault: true },
  { id: "violet", label: "Beautiful", value: "var(--hl-violet)", shortcut: 5, isDefault: true },
];

function readStoredJson<T>(key: string, fallback: T) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function NavButton({
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
      <span style={{ color: active ? "var(--accent-2)" : "var(--ink-4)" }}>{icon}</span>
      {label}
    </button>
  );
}

function Toggle({
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
      style={{ width: 34, height: 20, background: checked ? "var(--accent-color)" : "var(--rule-2)" }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-transform"
        style={{ width: 16, height: 16, left: 2, transform: checked ? "translateX(14px)" : "translateX(0)" }}
      />
    </button>
  );
}

function SettingRow({
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
    <div className="flex items-center gap-4 rounded-lg border p-4" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
      <span style={{ color: "var(--ink-3)" }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{title}</div>
        <div className="text-xs leading-5" style={{ color: "var(--ink-3)" }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const [activeTab, setActiveTab] = useState<TabId>("colors");
  const [theme, setTheme] = useState<AppTheme>(() => (localStorage.getItem("marginalia.theme") as AppTheme | null) ?? "light");
  const [typography, setTypography] = useState<TypographyChoice>(() => (localStorage.getItem("marginalia.typography") as TypographyChoice | null) ?? "editorial");
  const [colors, setColors] = useState<ColorSetting[]>(() => readStoredJson("marginalia.highlightColors", DEFAULT_COLORS));
  const [addingColor, setAddingColor] = useState(false);
  const [hue, setHue] = useState(45);
  const [saturation, setSaturation] = useState(92);
  const [lightness, setLightness] = useState(74);
  const [newColorName, setNewColorName] = useState("New color");
  const newColor = `hsl(${hue} ${saturation}% ${lightness}%)`;
  const previewTextColor = lightness > 58 ? "#111827" : "#ffffff";

  useEffect(() => {
    localStorage.setItem("marginalia.theme", theme);
    localStorage.setItem("marginalia.typography", typography);
    applyAppearanceSettings(theme, typography);
  }, [theme, typography]);

  useEffect(() => {
    localStorage.setItem("marginalia.highlightColors", JSON.stringify(colors));
  }, [colors]);

  function addColor() {
    const label = newColorName.trim() || "New color";
    setColors((items) => [
      ...items,
      {
        id: `custom-${Date.now()}`,
        label,
        value: newColor,
        shortcut: items.length < 9 ? items.length + 1 : undefined,
        isDefault: false,
      },
    ]);
    setNewColorName("New color");
    setAddingColor(false);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <aside className="shrink-0 border-r px-3 py-5" style={{ width: 218, borderColor: "var(--rule)", background: "var(--paper-2)" }}>
        <button onClick={() => navigate("/")} className="mb-5 flex items-center gap-2 rounded px-2 py-1 text-xs" style={{ color: "var(--ink-4)" }}>
          <ChevronLeft size={13} /> Dashboard
        </button>
        <div className="px-2 pb-3 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-4)" }}>
          Settings
        </div>
        <nav className="flex flex-col gap-1">
          <NavButton active={activeTab === "appearance"} icon={<Moon size={13} />} label="Appearance" onClick={() => setActiveTab("appearance")} />
          <NavButton active={activeTab === "colors"} icon={<Palette size={13} />} label="Highlight colors" onClick={() => setActiveTab("colors")} />
          <NavButton active={activeTab === "shortcuts"} icon={<KeyRound size={13} />} label="Shortcuts" onClick={() => setActiveTab("shortcuts")} />
          <NavButton active={activeTab === "ai"} icon={<Sparkles size={13} />} label="AI & summaries" onClick={() => setActiveTab("ai")} />
          <NavButton active={activeTab === "account"} icon={<SettingsIcon size={13} />} label="Account" onClick={() => setActiveTab("account")} />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-9">
        <div style={{ maxWidth: 658 }}>
          {activeTab === "colors" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, marginBottom: 8 }}>
                Highlight colors
              </h1>
              <p className="text-sm leading-6" style={{ color: "var(--ink-3)", maxWidth: 620 }}>
                Rename colors to match how you actually read. The first five colors are available from the extension toolbar with number keys.
              </p>

              <div className="mt-8 overflow-hidden rounded-lg border" style={{ borderColor: "var(--rule)" }}>
                {colors.map((color, index) => (
                  <div
                    key={color.id}
                    className="grid items-center border-b px-4"
                    style={{
                      gridTemplateColumns: "42px 1fr 120px 28px",
                      height: 45,
                      borderColor: "var(--rule)",
                      borderBottomWidth: index === colors.length - 1 ? 0 : 1,
                    }}
                  >
                    <span className="h-5 w-8 rounded" style={{ background: color.value }} />
                    <input
                      value={color.label}
                      onChange={(event) =>
                        setColors((items) => items.map((item) => item.id === color.id ? { ...item, label: event.target.value } : item))
                      }
                      className="bg-transparent text-sm font-medium outline-none"
                      style={{ color: "var(--ink)" }}
                    />
                    <span className="font-mono text-[11px]" style={{ color: "var(--ink-4)" }}>
                      {color.shortcut ? <>Press <kbd className="rounded border px-1" style={{ borderColor: "var(--rule-2)", background: "var(--paper-2)" }}>{color.shortcut}</kbd></> : "No shortcut"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex size-7 items-center justify-center rounded" style={{ color: "var(--ink-4)" }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={color.isDefault}
                          onClick={() => setColors((items) => items.filter((item) => item.id !== color.id))}
                          className="gap-2 text-xs"
                        >
                          <Trash2 size={12} /> Remove color
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {addingColor ? (
                <div className="mt-4 rounded-lg border p-4" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      value={newColorName}
                      onChange={(event) => setNewColorName(event.target.value)}
                      className="h-8 flex-1 rounded border bg-transparent px-2 text-sm outline-none"
                      style={{ borderColor: "var(--rule)" }}
                    />
                    <span
                      className="flex h-9 w-28 items-center justify-center rounded font-mono text-[10px]"
                      style={{ background: newColor, color: previewTextColor }}
                    >
                      Aa readable
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      ["Hue", hue, 0, 360, setHue, "linear-gradient(90deg, #f87171, #facc15, #4ade80, #38bdf8, #a78bfa, #f87171)"],
                      ["Saturation", saturation, 20, 100, setSaturation, `linear-gradient(90deg, hsl(${hue} 20% ${lightness}%), hsl(${hue} 100% ${lightness}%))`],
                      ["Lightness", lightness, 35, 86, setLightness, `linear-gradient(90deg, hsl(${hue} ${saturation}% 35%), hsl(${hue} ${saturation}% 86%))`],
                    ].map(([label, value, min, max, setter, background]) => (
                      <label key={label as string} className="grid items-center gap-3 text-xs" style={{ gridTemplateColumns: "76px 1fr 36px", color: "var(--ink-3)" }}>
                        <span className="font-mono">{label as string}</span>
                        <input
                          type="range"
                          min={min as number}
                          max={max as number}
                          value={value as number}
                          onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))}
                          className="h-2 cursor-pointer appearance-none rounded-full"
                          style={{ background: background as string }}
                        />
                        <span className="font-mono text-[10px]">{value as number}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" className="h-8 text-xs" onClick={() => setAddingColor(false)}>Cancel</Button>
                    <Button className="h-8 text-xs" onClick={addColor}>Add color</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingColor(true)} className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--ink-3)" }}>
                  <Plus size={13} /> Add a color
                </button>
              )}
            </>
          )}

          {activeTab === "appearance" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, marginBottom: 8 }}>
                Appearance
              </h1>
              <p className="mb-8 text-sm leading-6" style={{ color: "var(--ink-3)" }}>
                Theme and typography apply across the full dashboard.
              </p>
              <div className="flex flex-col gap-3">
                <SettingRow icon={<Moon size={16} />} title="Dark theme" description="Switch the dashboard to a low-glare reading surface.">
                  <Toggle checked={theme === "dark"} onChange={(checked) => setTheme(checked ? "dark" : "light")} />
                </SettingRow>
                <SettingRow icon={<Type size={16} />} title="Typography" description="Choose the type system used throughout the application.">
                  <Select value={typography} onValueChange={(value) => setTypography(value as TypographyChoice)}>
                    <SelectTrigger className="w-[190px]">
                      <SelectValue placeholder="Typography" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(Object.keys(TYPOGRAPHY_OPTIONS) as TypographyChoice[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {TYPOGRAPHY_OPTIONS[key].label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>
            </>
          )}

          {activeTab === "shortcuts" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, marginBottom: 8 }}>Shortcuts</h1>
              <p className="mb-8 text-sm leading-6" style={{ color: "var(--ink-3)" }}>
                These shortcuts are active in the dashboard. Number keys also work in the extension selection toolbar.
              </p>
              {[
                ["Open search", "Cmd/Ctrl K"],
                ["Next highlight", "J"],
                ["Previous highlight", "K"],
                ["Copy quote", "C"],
                ["Set highlight color", "1-5"],
              ].map(([label, key]) => (
                <div key={label} className="flex h-11 items-center border-b text-sm" style={{ borderColor: "var(--rule)" }}>
                  <span className="flex-1">{label}</span>
                  <kbd className="rounded border px-2 py-1 font-mono text-xs" style={{ borderColor: "var(--rule-2)", color: "var(--ink-3)" }}>{key}</kbd>
                </div>
              ))}
            </>
          )}

          {activeTab === "ai" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, marginBottom: 8 }}>AI & summaries</h1>
              <div className="mt-8 rounded-lg border p-5" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={15} style={{ color: "var(--accent-2)" }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--accent-2)" }}>Coming soon</span>
                </div>
                <p className="text-sm leading-6" style={{ color: "var(--ink-3)" }}>
                  AI summaries will turn groups of highlights into review notes and help answer questions from your library.
                </p>
              </div>
            </>
          )}

          {activeTab === "account" && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 600, marginBottom: 8 }}>Account</h1>
              <p className="mb-8 text-sm leading-6" style={{ color: "var(--ink-3)" }}>Manage your Marginalia identity and connected extension.</p>
              <div className="flex flex-col gap-3">
                <SettingRow icon={<User size={16} />} title={user?.name ?? "User"} description={user?.email ?? "Signed in"}>
                  <Check size={16} style={{ color: "var(--accent-2)" }} />
                </SettingRow>
                <SettingRow icon={<Link2 size={16} />} title="Browser extension" description="Generate a pairing code or reconnect the Chrome extension.">
                  <Button variant="outline" className="h-8 text-xs" onClick={() => navigate("/connect-extension")}>Connect</Button>
                </SettingRow>
                <SettingRow icon={<LogOut size={16} />} title="Sign out" description="End this dashboard session on the current device.">
                  <Button variant="outline" className="h-8 text-xs text-red-600" onClick={() => void signOut()}>Sign out</Button>
                </SettingRow>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
