import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/http";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";
import { applyTheme, CHARACTER_EVENT, readTheme, type ThemeName } from "../utils/character";

const themes: Array<{ name: ThemeName; label: string; icon: string; unlockKey: string; requirement?: string }> = [
  { name: "dark", label: "Тёмная", icon: "◐", unlockKey: "theme_dark" },
  { name: "light", label: "Светлая", icon: "☼", unlockKey: "theme_light" },
  { name: "cosmos", label: "Космос", icon: "✦", unlockKey: "theme_cosmos", requirement: "Откроется на 3 уровне" },
  { name: "vampire", label: "Вампир", icon: "☾", unlockKey: "theme_vampire", requirement: "Откроется на 5 уровне" }
];

export function ThemeSwitchButton() {
  const { profile, refreshProfile } = useGame();
  const { notify } = useToast();
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const current = useMemo(() => themes.find((entry) => entry.name === theme) ?? themes[0], [theme]);
  const unlocks = profile?.gameStats.unlocks ?? [];

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

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("click", closeOnOutsideClick);
    return () => window.removeEventListener("click", closeOnOutsideClick);
  }, []);

  function isUnlocked(unlockKey: string) {
    if (!profile && (unlockKey === "theme_dark" || unlockKey === "theme_light")) return true;
    return unlocks.some((unlock) => unlock.key === unlockKey && unlock.unlocked);
  }

  async function selectTheme(nextTheme: ThemeName) {
    if (!profile) {
      setTheme(nextTheme);
      setOpen(false);
      applyTheme(nextTheme);
      return;
    }

    try {
      const next = await api.profile.updatePreferences({ theme: nextTheme });
      setTheme(nextTheme);
      await refreshProfile();
      setOpen(false);
      applyTheme(next.gameStats.selectedTheme as ThemeName);
    } catch (err) {
      notify({ tone: "danger", title: "Тема закрыта", text: err instanceof Error ? err.message : "Пока нельзя выбрать эту тему." });
    }
  }

  return (
    <div className="theme-switcher-wrap" ref={hostRef}>
      <button
        type="button"
        className="theme-switcher"
        onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}
        title={`Тема: ${current.label}`}
        aria-label={`Сменить тему. Сейчас: ${current.label}`}
        aria-expanded={open}
      >
        <span className="theme-switcher-icon" aria-hidden="true">{current.icon}</span>
        <span>{current.label}</span>
      </button>
      {open ? (
        <div className="theme-switcher-menu">
          {themes.map((entry) => {
            const unlocked = isUnlocked(entry.unlockKey);
            return (
              <button
                type="button"
                key={entry.name}
                className={entry.name === theme ? "active" : ""}
                disabled={!unlocked}
                onClick={() => selectTheme(entry.name)}
              >
                <span aria-hidden="true">{entry.icon}</span>
                <strong>{entry.label}</strong>
                {!unlocked ? <small>{entry.requirement}</small> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
