import lolbotBase from "../assets/characters/mr-lolbot-base.png";
import nosferatuPlaceholder from "../assets/characters/nosferatu-placeholder.png";
import knightPlaceholder from "../assets/characters/knight-placeholder.png";
import type { GameStats, HpState } from "../api/types";
import { normalizeHpState } from "./hp";

export type ThemeName = "dark" | "light" | "rpg" | "vampire";
export type CharacterId = "lolbot" | "nosferatu" | "knight";

export const THEME_STORAGE_KEY = "flowvisior-theme";
export const CHARACTER_STORAGE_KEY = "flowvisior-character";
export const CHARACTER_EVENT = "flowvisior-character-change";

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  theme: ThemeName;
  accent: string;
  preview: string;
  avatarByState: Record<HpState, string>;
  quotes: string[];
}

function sameAvatarForAllStates(src: string): Record<HpState, string> {
  return {
    GREAT: src,
    NORMAL: src,
    TIRED: src,
    EXHAUSTED: src,
    CRITICAL: src
  };
}

export const characterCatalog: CharacterDefinition[] = [
  {
    id: "lolbot",
    name: "Мистер Лолбот",
    title: "тёмный спутник",
    description: "Ироничный проводник, который превращает хаос дня в понятные команды и не даёт прогрессу раствориться в шуме.",
    theme: "dark",
    accent: "#8b7cf6",
    preview: lolbotBase,
    avatarByState: sameAvatarForAllStates(lolbotBase),
    quotes: [
      "План без шага — просто красивый баг.",
      "Сегодня не нужен подвиг. Нужен один честный клик.",
      "Если день шумит, режь его на маленькие команды.",
      "Лень — это не враг. Это процесс без приоритета.",
      "Сначала делаем ядро, потом украшаем хаос.",
      "Ошибся? Отлично. Теперь карта стала точнее.",
      "Не спорь с усталостью — дай ей расписание.",
      "Большая цель любит маленькие повторения.",
      "Сохрани прогресс. Остальное допишем завтра.",
      "Даже тёмный экран становится маршрутом, если на нём есть следующий шаг."
    ]
  },
  {
    id: "nosferatu",
    name: "Носферату",
    title: "красная ветка",
    description: "Ночной стратег: холодный, цепкий и немного театральный. Он напоминает, что каждый долг всё равно проснётся завтра.",
    theme: "vampire",
    accent: "#c34f62",
    preview: nosferatuPlaceholder,
    avatarByState: sameAvatarForAllStates(nosferatuPlaceholder),
    quotes: [
      "Ночь длинная, но дедлайн обычно короче.",
      "Не трать кровь на суету — оставь её для главной цели.",
      "Город шепчет отвлечения. Выбирай только те, что кормят путь.",
      "Слабость не стыд. Стыд — притворяться, что её нет.",
      "Лучшие сделки с собой заключаются до рассвета.",
      "Отложенный шаг не исчезает. Он ждёт плату завтра.",
      "Тишина полезна: в ней слышно, какая задача врёт.",
      "Не всякая тьма мешает видеть. Иногда она убирает лишнее.",
      "Один завершённый пункт вкуснее десяти обещаний.",
      "Береги темп. Даже бессмертные устают от долгов."
    ]
  },
  {
    id: "knight",
    name: "Рыцарь",
    title: "светлая ветка",
    description: "Спокойный защитник порядка. Держит щит, уважает ритуалы и ведёт к цели без лишней суеты.",
    theme: "light",
    accent: "#89a7ff",
    preview: knightPlaceholder,
    avatarByState: sameAvatarForAllStates(knightPlaceholder),
    quotes: [
      "Щит держит удар, но путь держит дисциплина.",
      "Не ищи идеальный бой. Выиграй ближайший.",
      "Честь — это выполнить обещанное себе, когда никто не смотрит.",
      "Меч тупится от сомнений сильнее, чем от работы.",
      "Малый дозор каждый день лучше героического рывка раз в месяц.",
      "Перед стеной не спорят со стеной. Ищут ворота.",
      "Сначала порядок в лагере, потом поход.",
      "Победа любит тех, кто пришёл вовремя.",
      "Если устал, опусти забрало и сделай один шаг.",
      "Королевство строится не речами, а закрытыми задачами."
    ]
  }
];

export function readTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "dark" || saved === "light" || saved === "rpg" || saved === "vampire" ? saved : "dark";
}

export function applyTheme(theme: ThemeName) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function readSelectedCharacter(): CharacterId | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(CHARACTER_STORAGE_KEY);
  return saved === "lolbot" || saved === "nosferatu" || saved === "knight" ? saved : null;
}

export function getCharacter(id?: CharacterId | null) {
  return characterCatalog.find((entry) => entry.id === id) ?? characterCatalog[0];
}

export function saveSelectedCharacter(id: CharacterId) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CHARACTER_STORAGE_KEY, id);
  }
  const character = getCharacter(id);
  applyTheme(character.theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHARACTER_EVENT, { detail: { id } }));
  }
}

export function avatarSrcForState(characterId: CharacterId | null | undefined, state: HpState) {
  return getCharacter(characterId).avatarByState[state] ?? lolbotBase;
}

export function hpStateTitle(state: HpState) {
  switch (state) {
    case "GREAT": return "Пик формы";
    case "NORMAL": return "Ровный темп";
    case "TIRED": return "Усталость";
    case "EXHAUSTED": return "Истощение";
    case "CRITICAL": return "Критическое HP";
    default: return "Состояние";
  }
}

export function resolveAvatar(characterId: CharacterId | null | undefined, stats?: GameStats | null) {
  const hpState = normalizeHpState(stats);
  return {
    character: getCharacter(characterId),
    hpState,
    src: avatarSrcForState(characterId, hpState)
  };
}


export function getDailyQuote(characterId: CharacterId | null | undefined, date = new Date()) {
  const character = getCharacter(characterId);
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const index = Math.abs(dayOfYear + character.id.length) % character.quotes.length;
  return character.quotes[index];
}
