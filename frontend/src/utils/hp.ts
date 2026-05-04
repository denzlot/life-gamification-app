import type { GameStats, HpState } from "../api/types";

export type AvatarMood = "perfect" | "middle" | "bad";

export function getHpState(hp: number, maxHp = 100): HpState {
  const ratio = maxHp > 0 ? (hp / maxHp) * 100 : hp;
  if (ratio >= 80) return "GREAT";
  if (ratio >= 50) return "NORMAL";
  if (ratio >= 30) return "TIRED";
  if (ratio >= 10) return "EXHAUSTED";
  return "CRITICAL";
}

export function normalizeHpState(stats?: Pick<GameStats, "hp" | "maxHp" | "hpState"> | null): HpState {
  if (!stats) return "NORMAL";
  const state = String(stats.hpState ?? "").toUpperCase() as HpState;
  if (["GREAT", "NORMAL", "TIRED", "EXHAUSTED", "CRITICAL"].includes(state)) return state;
  return getHpState(stats.hp, stats.maxHp);
}

export function avatarMood(stats?: Pick<GameStats, "hp" | "maxHp"> | null): AvatarMood {
  if (!stats || !stats.maxHp) return "middle";
  const ratio = stats.hp / stats.maxHp;
  if (stats.hp >= stats.maxHp) return "perfect";
  if (ratio < 0.3) return "bad";
  return "middle";
}

export function applyHpState(stats?: Pick<GameStats, "hp" | "maxHp" | "hpState"> | null) {
  const state = normalizeHpState(stats).toLowerCase();
  document.documentElement.setAttribute("data-hp-state", state);
}

export function hpPhrase(state: HpState) {
  switch (state) {
    case "GREAT": return "Отличная форма. Можно брать сложное.";
    case "NORMAL": return "Стабильное состояние. Держим ритм.";
    case "TIRED": return "Энергии меньше. Подойдут короткие победы.";
    case "EXHAUSTED": return "HP низкий. Лучше закрыть пару простых пунктов.";
    case "CRITICAL": return "Критическое состояние. Один мягкий шаг уже считается.";
    default: return "Стабильное состояние.";
  }
}

export function hpStateLabel(state: HpState) {
  switch (state) {
    case "GREAT": return "отличное";
    case "NORMAL": return "нормальное";
    case "TIRED": return "усталость";
    case "EXHAUSTED": return "истощение";
    case "CRITICAL": return "критично";
    default: return "нормальное";
  }
}

export function avatarMoodLabel(mood: AvatarMood) {
  switch (mood) {
    case "perfect": return "безупречное";
    case "middle": return "среднее";
    case "bad": return "ужасное";
    default: return "среднее";
  }
}

export function xpForLevel(level: number) {
  return (500 * (level - 1) * level) / 2;
}

export function xpForNextLevel(level: number) {
  return (500 * level * (level + 1)) / 2;
}
