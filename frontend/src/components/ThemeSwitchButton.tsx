import { useEffect, useMemo, useState } from "react";

type ThemeName = "dark" | "light" | "rpg" | "vampire";

const themes: Array<{ name: ThemeName; label: string; icon: string }> = [
  { name: "dark", label: "Тёмная", icon: "◐" },
  { name: "light", label: "Светлая", icon: "☼" },
  { name: "rpg", label: "РПГ", icon: "✦" },
  { name: "vampire", label: "Vampire", icon: "☾" }
];

const storageKey = "flowvisior-theme";

function readTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(storageKey);
  return themes.some((theme) => theme.name === saved) ? (saved as ThemeName) : "dark";
}

export function ThemeSwitchButton() {
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());
  const current = useMemo(() => themes.find((entry) => entry.name === theme) ?? themes[0], [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  function cycleTheme() {
    const index = themes.findIndex((entry) => entry.name === theme);
    setTheme(themes[(index + 1) % themes.length].name);
  }

  return (
    <button type="button" className="theme-switcher" onClick={cycleTheme} title={`Тема: ${current.label}`} aria-label={`Сменить тему. Сейчас: ${current.label}`}>
      <span className="theme-switcher-icon" aria-hidden="true">{current.icon}</span>
      <span>{current.label}</span>
    </button>
  );
}
