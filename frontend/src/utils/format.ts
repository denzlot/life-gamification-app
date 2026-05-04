import type { ActivityAction, DailyPlanItemStatus, DailyPlanStatus, QuestStatus, QuestStepStatus, SourceType, TaskStatus, UserStatus } from "../api/types";

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

export function signed(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return value > 0 ? `+${value}` : String(value);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pct(done: number, total: number) {
  if (!total) return 0;
  return clamp(Math.round((done / total) * 100), 0, 100);
}

export function range(n: number) {
  return Array.from({ length: n }, (_, index) => index);
}

export function sourceLabel(value?: SourceType | string | null) {
  switch (value) {
    case "TASK": return "Задача";
    case "HABIT": return "Привычка";
    case "QUEST": return "Квест";
    case "MANUAL": return "Добавлено вручную";
    default: return "Событие";
  }
}

export function itemStatusLabel(value?: DailyPlanItemStatus | string | null) {
  switch (value) {
    case "PENDING": return "В плане";
    case "COMPLETED": return "Выполнено";
    case "FAILED": return "Не выполнено";
    default: return "—";
  }
}

export function planStatusLabel(value?: DailyPlanStatus | "EMPTY" | string | null) {
  switch (value) {
    case "PLANNED": return "Запланирован";
    case "ACTIVE": return "День открыт";
    case "CLOSED": return "Закрыт";
    case "EMPTY": return "Не открывался";
    default: return "—";
  }
}

export function questStatusLabel(value?: QuestStatus | string | null) {
  switch (value) {
    case "ACTIVE": return "Активен";
    case "COMPLETED": return "Завершён";
    case "ARCHIVED": return "Архив";
    default: return "—";
  }
}

export function stepStatusLabel(value?: QuestStepStatus | string | null) {
  switch (value) {
    case "PENDING": return "В работе";
    case "COMPLETED": return "Выполнен";
    case "SKIPPED": return "Пропущен";
    default: return "—";
  }
}

export function taskStatusLabel(value?: TaskStatus | string | null) {
  switch (value) {
    case "COMPLETED": return "Выполнена";
    case "FAILED": return "Не выполнена";
    case "OPEN":
    case "TODO":
    case "PENDING": return "Открыта";
    default: return value ? String(value).toLowerCase().replace(/_/g, " ") : "—";
  }
}

export function actionLabel(value?: ActivityAction | string | null) {
  switch (value) {
    case "COMPLETED": return "Выполнено";
    case "FAILED": return "Не выполнено";
    case "RESET": return "Возвращено в план";
    case "DAY_CLOSED": return "День закрыт";
    default: return "Событие";
  }
}

export function userStatusLabel(value?: UserStatus | string | null) {
  switch (value) {
    case "ACTIVE": return "Активен";
    case "BANNED": return "Заблокирован";
    default: return "—";
  }
}
