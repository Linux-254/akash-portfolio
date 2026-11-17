export type FontPairId = "editorial" | "modern-serif" | "grotesque-literary";

export interface ThemeColors {
  neutralLight: string;
  neutralDark: string;
  bold: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fontPair: FontPairId;
}

export interface FontPair {
  id: FontPairId;
  label: string;
  displayVar: string;
  bodyVar: string;
  monoVar: string;
}

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  editorial: {
    id: "editorial",
    label: "Instrument Serif + Familjen Grotesk",
    displayVar: "var(--font-instrument-serif)",
    bodyVar: "var(--font-familjen-grotesk)",
    monoVar: "var(--font-jetbrains-mono)",
  },
  "modern-serif": {
    id: "modern-serif",
    label: "Fraunces + Inter Tight",
    displayVar: "var(--font-fraunces)",
    bodyVar: "var(--font-inter-tight)",
    monoVar: "var(--font-jetbrains-mono)",
  },
  "grotesque-literary": {
    id: "grotesque-literary",
    label: "Bricolage Grotesque + Newsreader",
    displayVar: "var(--font-bricolage-grotesque)",
    bodyVar: "var(--font-newsreader)",
    monoVar: "var(--font-jetbrains-mono)",
  },
};

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    neutralLight: "#F3F6F4",
    neutralDark: "#0D171A",
    bold: "#0B7A68",
  },
  fontPair: "editorial",
};

let currentTheme: ThemeConfig = {
  colors: { ...DEFAULT_THEME.colors },
  fontPair: DEFAULT_THEME.fontPair,
};

type ThemeListener = (theme: ThemeConfig) => void;
const listeners = new Set<ThemeListener>();

export function getActiveTheme(): ThemeConfig {
  return currentTheme;
}

export function subscribeTheme(fn: ThemeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyThemeToRoot(theme: ThemeConfig = currentTheme): void {
  currentTheme = {
    colors: { ...theme.colors },
    fontPair: theme.fontPair,
  };

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const pair = FONT_PAIRS[currentTheme.fontPair] ?? FONT_PAIRS.editorial;
    root.style.setProperty("--c-neutral-light", currentTheme.colors.neutralLight);
    root.style.setProperty("--c-neutral-dark", currentTheme.colors.neutralDark);
    root.style.setProperty("--c-bold", currentTheme.colors.bold);
    root.style.setProperty(
      "--c-bold-soft",
      `color-mix(in srgb, ${currentTheme.colors.bold} 14%, ${currentTheme.colors.neutralLight})`,
    );
    root.style.setProperty(
      "--c-line",
      `color-mix(in srgb, ${currentTheme.colors.neutralDark} 14%, transparent)`,
    );
    root.style.setProperty("--font-display", pair.displayVar);
    root.style.setProperty("--font-body", pair.bodyVar);
    root.style.setProperty("--font-mono", pair.monoVar);
  }

  listeners.forEach((fn) => fn(currentTheme));
}
