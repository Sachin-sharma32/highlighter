import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeft,
  KeyRound,
  Moon,
  Palette,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import {
  applyAppearanceSettings,
  type AppTheme,
  type TypographyChoice,
} from "@/lib/appearance";
import { NavButton } from "./components/NavButton";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { ColorsTab } from "./tabs/ColorsTab";
import { ShortcutsTab } from "./tabs/ShortcutsTab";
import { AITab } from "./tabs/AITab";
import { AccountTab } from "./tabs/AccountTab";
import {
  DEFAULT_COLORS,
  readStoredJson,
  type ColorSetting,
  type TabId,
} from "./lib";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const [activeTab, setActiveTab] = useState<TabId>("colors");
  const [theme, setTheme] = useState<AppTheme>(
    () =>
      (localStorage.getItem("marginalia.theme") as AppTheme | null) ?? "light",
  );
  const [typography, setTypography] = useState<TypographyChoice>(
    () =>
      (localStorage.getItem(
        "marginalia.typography",
      ) as TypographyChoice | null) ?? "editorial",
  );

  const fetchedColors = useQuery(api.settings.getColors);
  const saveColorsToConvex = useMutation(api.settings.saveColors);
  const [localColors, setLocalColors] = useState<ColorSetting[] | null>(null);

  const baseColors = fetchedColors
    ? (fetchedColors as ColorSetting[])
    : DEFAULT_COLORS;
  const colors = localColors ?? baseColors;

  useEffect(() => {
    if (
      fetchedColors === null &&
      !localStorage.getItem("marginalia.migratedColors")
    ) {
      const local = readStoredJson(
        "marginalia.highlightColors",
        DEFAULT_COLORS,
      );
      setLocalColors(local);
      void saveColorsToConvex({ colors: local });
      localStorage.setItem("marginalia.migratedColors", "true");
    }
  }, [fetchedColors, saveColorsToConvex]);

  useEffect(() => {
    localStorage.setItem("marginalia.theme", theme);
    localStorage.setItem("marginalia.typography", typography);
    applyAppearanceSettings(theme, typography);
  }, [theme, typography]);

  function updateColors(next: ColorSetting[]) {
    setLocalColors(next);
    void saveColorsToConvex({ colors: next });
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <aside
        className="shrink-0 border-r px-3 py-5"
        style={{
          width: 218,
          borderColor: "var(--rule)",
          background: "var(--paper-2)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="mb-5 flex items-center gap-2 rounded px-2 py-1 text-xs"
          style={{ color: "var(--ink-4)" }}
        >
          <ChevronLeft size={13} /> Dashboard
        </button>
        <div
          className="px-2 pb-3 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--ink-4)" }}
        >
          Settings
        </div>
        <nav className="flex flex-col gap-1">
          <NavButton
            active={activeTab === "appearance"}
            icon={<Moon size={13} />}
            label="Appearance"
            onClick={() => setActiveTab("appearance")}
          />
          <NavButton
            active={activeTab === "colors"}
            icon={<Palette size={13} />}
            label="Highlight colors"
            onClick={() => setActiveTab("colors")}
          />
          <NavButton
            active={activeTab === "shortcuts"}
            icon={<KeyRound size={13} />}
            label="Shortcuts"
            onClick={() => setActiveTab("shortcuts")}
          />
          <NavButton
            active={activeTab === "ai"}
            icon={<Sparkles size={13} />}
            label="AI & summaries"
            onClick={() => setActiveTab("ai")}
          />
          <NavButton
            active={activeTab === "account"}
            icon={<SettingsIcon size={13} />}
            label="Account"
            onClick={() => setActiveTab("account")}
          />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-9">
        <div style={{ maxWidth: 658 }}>
          {activeTab === "colors" && (
            <ColorsTab colors={colors} updateColors={updateColors} />
          )}
          {activeTab === "appearance" && (
            <AppearanceTab
              theme={theme}
              setTheme={setTheme}
              typography={typography}
              setTypography={setTypography}
            />
          )}
          {activeTab === "shortcuts" && <ShortcutsTab />}
          {activeTab === "ai" && <AITab />}
          {activeTab === "account" && (
            <AccountTab
              user={user}
              onConnect={() => navigate("/connect-extension")}
              onSignOut={() => void signOut()}
            />
          )}
        </div>
      </main>
    </div>
  );
}
