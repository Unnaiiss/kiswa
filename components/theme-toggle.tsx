"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme, setStoredTheme } from "@/lib/theme";

/** Both icons always render; which one is visible is decided purely by
 * whether an ancestor carries the `.dark` class (Tailwind's `dark:`
 * variant — see app/globals.css's `@custom-variant dark`), which the
 * blocking init script already sets correctly before hydration. This means
 * no useState/useEffect is needed here at all, so there's no light/dark
 * flash and no hydration-mismatch risk from reading the DOM during render. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light / dark theme"
      title="Toggle light / dark theme"
      className={className}
    >
      <Sun size={18} className="hidden dark:block" />
      <Moon size={18} className="block dark:hidden" />
    </button>
  );
}
