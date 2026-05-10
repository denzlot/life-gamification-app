import { useEffect, useMemo, useState } from "react";
import { applyTheme, CHARACTER_EVENT, readTheme, type ThemeName } from "../utils/character";

const themes: Array<{ name: ThemeName; label: string; icon: string }> = [
  { name: "dark", label: "Тёмная", icon: "◐" },
  { name: "vampire", label: "Красная", icon: "☾" },
  { name: "light", label: "Светлая", icon: "☼" },
  { name: "cosmos", label: "Космос", icon: "✦" }
];

export function ThemeSwitchButton() {
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());
  const current = useMemo(() => themes.find((entry) => entry.name === theme) ?? themes[0], [theme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    function syncTheme() {
      setTheme(readTheme());
    }

    window.addEventListener(CHARACTER_EVENT, syncTheme as EventListener);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener(CHARACTER_EVENT, syncTheme as EventListener);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

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
