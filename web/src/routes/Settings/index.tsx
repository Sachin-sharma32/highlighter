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
import { useAppStore } from "@/store";
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
  const setConnectExtensionModalOpen = useAppStore(
    (s) => s.setConnectExtensionModalOpen,
  );
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
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink md:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 border-b border-rule bg-paper-2 px-3 py-3 md:w-[218px] md:gap-0 md:border-b-0 md:border-r md:py-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 self-start rounded px-2 py-1 text-xs text-ink-4 md:mb-5"
        >
          <ChevronLeft size={13} /> Dashboard
        </button>
        <div className="hidden px-2 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4 md:block">
          Settings
        </div>
        <nav className="-mx-1 flex flex-row gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
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

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-10 md:py-9">
        <div className="max-w-[658px]">
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
              onConnect={() => {
                setConnectExtensionModalOpen(true);
                navigate("/");
              }}
              onSignOut={() => void signOut()}
            />
          )}
        </div>
      </main>
    </div>
  );
}
