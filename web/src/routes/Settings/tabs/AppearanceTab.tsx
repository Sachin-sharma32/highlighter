import { Moon, Type } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TYPOGRAPHY_OPTIONS,
  type AppTheme,
  type TypographyChoice,
} from "@/lib/appearance";
import { SettingRow } from "../components/SettingRow";
import { Toggle } from "../components/Toggle";

export function AppearanceTab({
  theme,
  setTheme,
  typography,
  setTypography,
}: {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  typography: TypographyChoice;
  setTypography: (typography: TypographyChoice) => void;
}) {
  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Appearance
      </h1>
      <p className="mb-8 text-sm leading-6" style={{ color: "var(--ink-3)" }}>
        Theme and typography apply across the full dashboard.
      </p>
      <div className="flex flex-col gap-3">
        <SettingRow
          icon={<Moon size={16} />}
          title="Dark theme"
          description="Switch the dashboard to a low-glare reading surface."
        >
          <Toggle
            checked={theme === "dark"}
            onChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </SettingRow>
        <SettingRow
          icon={<Type size={16} />}
          title="Typography"
          description="Choose the type system used throughout the application."
        >
          <Select
            value={typography}
            onValueChange={(value) => setTypography(value as TypographyChoice)}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Typography" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(Object.keys(TYPOGRAPHY_OPTIONS) as TypographyChoice[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {TYPOGRAPHY_OPTIONS[key].label}
                    </SelectItem>
                  ),
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingRow>
      </div>
    </>
  );
}
