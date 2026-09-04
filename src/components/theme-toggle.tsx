"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_EVENT = "themechange";

/**
 * The theme lives on `document.documentElement.dataset.theme`, written by the
 * inline script in the root layout before first paint. This component reads
 * that DOM state rather than mirroring it into React state — an effect that
 * calls setState on mount would cause a cascading render, and the value is
 * already correct in the DOM by the time React runs.
 */
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_EVENT, onChange);
  media.addEventListener("change", onChange);

  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The server cannot know the reader's theme; render the light-mode icon and
 *  let the first client snapshot correct it. */
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing can refuse writes; the toggle still works this session.
    }

    window.dispatchEvent(new Event(THEME_EVENT));
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
      ) : (
        <Moon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
      )}
    </button>
  );
}
