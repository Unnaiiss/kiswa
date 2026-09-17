export const THEME_STORAGE_KEY = "kiswa-theme";

export type Theme = "light" | "dark";

/** Site-wide default — matches KISWA's original, pre-theming dark+gold
 * look, so anyone who's never touched the toggle (or whose browser blocks
 * localStorage) sees exactly what shipped before theming existed. */
export const DEFAULT_THEME: Theme = "dark";

/** Adds/removes the `.dark` class on <html> — :root itself holds the LIGHT
 * palette (see app/globals.css), so dark mode is the opt-in override. Safe
 * to call before React hydrates (see the inline script in app/layout.tsx),
 * since it only touches the DOM, never React state. */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing / storage disabled — theme just won't persist across
    // visits, still applies for this page load via applyTheme().
  }
}

/** Stringified and inlined as a beforeInteractive script (see app/layout.tsx)
 * so the right class is on <html> before first paint — must stay
 * dependency-free (no imports work inside an inlined script body) and stay
 * in sync with getStoredTheme/DEFAULT_THEME above by hand. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark" ? stored : "${DEFAULT_THEME}";
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;
