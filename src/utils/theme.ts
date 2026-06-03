export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "arenaos.theme";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function getStoredTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredTheme(theme: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures; the visual theme can still update for this tab.
  }
}

export function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const storedTheme = getStoredTheme();
  if (isThemeMode(storedTheme)) return storedTheme;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function applyTheme(theme: ThemeMode, persist = false) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (persist && typeof window !== "undefined") {
    setStoredTheme(theme);
  }
}

export function initializeTheme() {
  applyTheme(getPreferredTheme());
}

export function isValidTheme(value: string | null): value is ThemeMode {
  return isThemeMode(value);
}
