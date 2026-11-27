import { create } from "zustand";

export type ThemePref = "light" | "dark" | "system";

const KEY = "ms.theme";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolveTheme(pref, media().matches);
}

interface ThemeState {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  pref: readPref(),
  setPref: (pref) => {
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* storage unavailable */
    }
    apply(pref);
    set({ pref });
  },
}));

/** Keep "system" in step with the OS setting. Call once at startup. */
export function watchSystemTheme() {
  const m = media();
  const onChange = () => {
    if (useTheme.getState().pref === "system") apply("system");
  };
  m.addEventListener("change", onChange);
  apply(useTheme.getState().pref);
  return () => m.removeEventListener("change", onChange);
}
