import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  applyTheme,
  getPreferredTheme,
  isValidTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/utils/theme";

export function ModeToggle() {
  const shouldReduceMotion = useReducedMotion();
  const [theme, setTheme] = useState<ThemeMode>(() => getPreferredTheme());
  const isLight = theme === "light";

  useEffect(() => {
    applyTheme(theme, true);
  }, [theme]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY && isValidTheme(event.newValue)) {
        setTheme(event.newValue);
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const nextTheme = isLight ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="group relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-2 top-2 h-3 rounded-full bg-cyan-300/20 blur-md transition group-hover:bg-cyan-200/30"
      />

      <motion.span
        key={theme}
        aria-hidden="true"
        initial={
          shouldReduceMotion
            ? false
            : { opacity: 0, rotate: isLight ? -60 : 60, scale: 0.82 }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : { opacity: 1, rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {isLight ? <Moon className="size-5" /> : <Sun className="size-5" />}
      </motion.span>

      <span className="sr-only">Mode toggle</span>
    </button>
  );
}
