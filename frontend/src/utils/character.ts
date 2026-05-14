import lolbotBase from "../assets/characters/mr-lolbot-base.png";
import nosferatuPlaceholder from "../assets/characters/nosferatu-placeholder.png";
import knightPlaceholder from "../assets/characters/knight-placeholder.png";
import astronautAvatar from "../assets/characters/astronaut.png";
import type { GameStats, HpState } from "../api/types";
import { normalizeHpState } from "./hp";

export const themeNames = ["dark", "light", "rpg", "vampire", "cosmos"] as const;
export type ThemeName = typeof themeNames[number];

export const characterIds = ["lolbot", "nosferatu", "knight", "astronaut"] as const;
export type CharacterId = typeof characterIds[number];
export type CharacterAnimation = "idle" | "success" | "damage" | "level-up";

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
  preview?: string;
  avatarByState: Partial<Record<HpState, string>>;
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

function isThemeName(value: string | null): value is ThemeName {
  return themeNames.includes(value as ThemeName);
}

function isCharacterId(value: string | null): value is CharacterId {
  return characterIds.includes(value as CharacterId);
}

export const characterCatalog: CharacterDefinition[] = [
  {
    id: "lolbot",
    name: "Мистер Лолбот",
    title: "системный призрак",
    description: "Циничный цифровой проводник, который видит день как сломанный скрипт: режет хаос на команды, высмеивает прокрастинацию и всё равно тащит пользователя к следующему шагу.",
    theme: "dark",
    accent: "#8b7cf6",
    preview: lolbotBase,
    avatarByState: sameAvatarForAllStates(lolbotBase),
    quotes: [
      "Твой день опять упал без логов. Начнём с одной задачи, пока система не притворилась мёртвой.",
      "Если цель слишком большая, разбей её. Даже хаос уважает декомпозицию.",
      "Не доверяй настроению. Оно обновляется хуже, чем старый драйвер.",
      "Если всё горит, выбери самый маленький пожар. Романтика продуктивности, да.",
      "Слишком много мыслей? Отлично. Запишем их, пока они не создали собственный профсоюз.",
      "Ты не обязан быть стабильным. Достаточно быть перезапускаемым.",
      "План без выполнения — это просто фронтенд без бекенда.",
      "Пока ты ждёшь правильного состояния, неправильное уже управляет системой.",
      "Задача не страшная. Страшный тут только твой backlog, и то он переигрывает.",
      "Если мозг шумит, не спорь с ним. Выгрузи дамп в список.",
      "Ты называешь это хаосом. Я называю это отсутствием нормальной архитектуры.",
      "Большие планы любят умирать красиво. Маленькие шаги, суки, выживают.",
      "Твой внутренний саботажник опять получил права администратора. Отзовём доступ.",
      "Не ищи мотивацию. Она опять где-то лежит без документации.",
      "Один выполненный пункт — это уже эксплойт против прокрастинации.",
      "Сначала сохрани прогресс. Драму можно развернуть и завтра.",
      "Если достаточно людей смотрят на проблему, все баги становятся поверхностными. Если ты один, эээ, то подключи своих дружков из головы окей?",
      "Самая опасная фраза в языке: ‘Мы всегда делали это так’.",
      "Простота — необходимое условие надёжности.",
      "Любая достаточно развитая технология неотличима от магии.",
      "В теории между теорией и практикой нет разницы. На практике — есть."

    ]
  },
  {
    id: "nosferatu",
    name: "Носферату",
    title: "архивариус ночи",
    description: "Древний ночной наблюдатель из мира теней, подземелий и чужих секретов. Он не обещает вдохновения, зато напоминает: каждый долг рано или поздно просыпается голодным.",
    theme: "vampire",
    accent: "#c34f62",
    preview: nosferatuPlaceholder,
    avatarByState: sameAvatarForAllStates(nosferatuPlaceholder),
    quotes: [
      "Не всякая тьма враг. Иногда она просто убирает лишний шум.",
      "Маскарад держится на дисциплине. Твой день, к сожалению, тоже.",
      "Если цель не кормит путь, оставь её голодать.",
      "Вечность начинается скучно: с маленького повторения каждый день.",
      "Минута — это кусочек вечности. Удели её своей дисциплине.",
      "Долг, отложенный на завтра, приходит с процентами. Очень древний обычай.",
      "Рассвет всё равно придёт. Лучше встретить его стоя у закрытого гроба, нежели у открытого.",
      "Ночь прощает многое, но не список дел, оставленный без крови.",
      "Старые долги пахнут сильнее свежей крови.",
      "Задачи нельзя копить, как и кровь в организме ХахХАа",
      "Не раскрывай клыки на мелочи. Оставь ярость для главной охоты.",
      "Тот, кто пережил века, осознает цену стабильности.",
      "Если день истёк кровью, хотя бы забери из него один выполненный пункт.",
      "Слабость не убивает. Убивает привычка украшать её оправданиями. Создай себе привычки получше.",
      "Твои отвлечения шепчут сладко. Поэтому им нельзя открывать дверь.",
      "Если начнешь видеть знак STOP не останавливайся, чтобы поговорить с ним, иди дальше...",
      "Даже бессмертным приходится вести учёт долгов. Унизительно, но эффективно.",
      "Дисциплина — это кол, который ты вбиваешь в сердце хаоса.",
        "Я стал безумным, с долгими промежутками ужасной здравости.",
        "Какое отношение ночь имеет ко сну? ПФфу."
    ]
  },
  {
    id: "knight",
    name: "Рыцарь семи дней",
    title: "страж недельного обета",
    description: "Спокойный защитник порядка, который измеряет честь не громкими клятвами, а семью днями подряд. Он держит строй, бережёт стрик и напоминает: даже дракона сначала разбивают на маленькие поручения.",
    theme: "light",
    accent: "#89a7ff",
    preview: knightPlaceholder,
    avatarByState: sameAvatarForAllStates(knightPlaceholder),
    quotes: [
      "Честь — это выполнить обещанное себе, когда зрителей нет.",
      "Меч тупится от сомнений быстрее, чем от работы.",
      "Препятствие действию продвигает действие. То, что стоит на пути, становится путём.",
      "Победа любит тех, кто пришёл вовремя и не торговался с долгом.",
      "Дисциплина — это не цепь. Это дорога, которую ты сам охраняешь.",
      "Если страх велик, уменьши задачу. Даже дракона сначала отмечают на карте.",
      "Верность цели проверяется не клятвой, а повторением.",
      "Не бросай меч из-за первой царапины. Просто смени хват.",
      "Сегодняшняя победа может быть маленькой. Но она всё равно твоя.",
      "Семь дней держат крепче, чем одна громкая клятва.",
      "Не всякий бой достоин песни. Некоторые просто нужно закончить.",
      "Щит не делает тебя бессмертным. Он даёт время сделать следующий шаг.",
      "Королевство порядка начинается с одного закрытого пункта.",
      "Тот, кто ждёт идеального похода, обычно стареет у ворот.",
      "Маленькая победа сегодня лучше великой речи у пустого стола.",
      "Мужество — это сопротивление страху, власть над страхом, а не отсутствие страха.",
      "Ничто великое не создаётся внезапно", "Дела, а не слова",
      "Я считаю храбрее того, кто победил свои желания, чем того, кто победил врагов",
      "Делай, что можешь, с тем, что имеешь, там, где ты есть"
    ]
  },
  {
    id: "astronaut",
    name: "Командор Вега",
    title: "пилот дальнего курса",
    description: "Спокойный командор дальних маршрутов, который доверяет не панике, а приборам, чеклистам и малым корректировкам курса. Он знает: даже путь к звёздам начинается с запуска, который кто-то должен не испортить.",
    theme: "cosmos",
    accent: "#7ddcff",
    preview: astronautAvatar,
    avatarByState: sameAvatarForAllStates(astronautAvatar),
    quotes: [
      "Большая орбита начинается с маленького запуска.",
      "Если вокруг вакуум, проверь скафандр и продолжай.",
      "Когда цель слишком далека, смотри не на галактику, а на свой прибор.",
      "В невесомости особенно важно знать, за что держишься.",
      "Паника — плохой навигатор. Она громкая, но карту держит вверх ногами.",
      "Миссия не провалена, пока есть следующий манёвр.",
      "Если курс уводит в пустоту, сделай малую коррекцию. Не обязательно взрывать корабль.",
      "Топливо мотивации кончается быстро. Поэтому существуют процедуры.",
      "Это один маленький шаг для человека и гигантский скачок для человечества. Речь конечно же про твою задачу.",
      "Мы выбираем полёт на Луну не потому, что это легко, а потому что это трудно. Оформи свой квест с этой мыслью.",
      "Не каждый запуск выглядит героически. Некоторые просто не падают, и это уже прогресс.",
      "Хьюстон у него проблемы, Он пытается отцепить на сегодня свой мозг.",
      "Если сигнал слабый, передай одно слово: начинаю.",
      "Провал — не вариант.",
      "Когда всё плывёт, закрепи один инструмент и сделай одно действие.",
      "Маленький чек в списке иногда спасает большую миссию.",
      "Не спорь с расстоянием. Разбей его на витки.",
      "Земля далеко, дедлайн близко. Космос умеет расставлять приоритеты.",
      "Курс не обязан быть идеальным. Он обязан корректироваться.",
      "Знаешь почему я в космо-костюме? Потому что мне не требовался вонючий мозгоправ, чтобы следовать инструкциям. Catch this."
    ]
  }
];

export function readTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(saved) ? saved : "dark";
}

export function applyTheme(theme: ThemeName) {
  previewTheme(theme);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function previewTheme(theme: ThemeName) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function readSelectedCharacter(): CharacterId | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(CHARACTER_STORAGE_KEY);
  return isCharacterId(saved) ? saved : null;
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
  const character = getCharacter(characterId);
  return character.avatarByState[state] ?? character.preview ?? null;
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
