export type AppTheme = "light" | "dark";
export type TypographyChoice = "editorial" | "classic" | "literary" | "modern" | "mono";

export const TYPOGRAPHY_OPTIONS: Record<
  TypographyChoice,
  { label: string; display: string; ui: string; quote: string }
> = {
  editorial: {
    label: "Editorial",
    display: '"Fraunces", Georgia, serif',
    ui: '"Inter", -apple-system, sans-serif',
    quote: '"Fraunces", Georgia, serif',
  },
  classic: {
    label: "Classic serif",
    display: '"Source Serif 4", Georgia, serif',
    ui: '"Inter", -apple-system, sans-serif',
    quote: '"Source Serif 4", Georgia, serif',
  },
  literary: {
    label: "Literary",
    display: '"Lora", Georgia, serif',
    ui: '"Nunito Sans", -apple-system, sans-serif',
    quote: '"Lora", Georgia, serif',
  },
  modern: {
    label: "Modern",
    display: '"IBM Plex Sans", "Inter", sans-serif',
    ui: '"IBM Plex Sans", "Inter", sans-serif',
    quote: '"Source Serif 4", Georgia, serif',
  },
  mono: {
    label: "Mono study",
    display: '"JetBrains Mono", ui-monospace, monospace',
    ui: '"JetBrains Mono", ui-monospace, monospace',
    quote: '"JetBrains Mono", ui-monospace, monospace',
  },
};

export function readStoredAppearance() {
  const theme = localStorage.getItem("marginalia.theme") as AppTheme | null;
  const typography = localStorage.getItem("marginalia.typography") as TypographyChoice | null;
  return {
    theme: theme ?? "light",
    typography: typography ?? "editorial",
  };
}

export function applyAppearanceSettings(theme: AppTheme, typography: TypographyChoice) {
  const root = document.documentElement;
  const type = TYPOGRAPHY_OPTIONS[typography] ?? TYPOGRAPHY_OPTIONS.editorial;
  root.dataset.theme = theme;
  root.style.setProperty("--font-display", type.display);
  root.style.setProperty("--font-ui", type.ui);
  root.style.setProperty("--font-quote", type.quote);
}
