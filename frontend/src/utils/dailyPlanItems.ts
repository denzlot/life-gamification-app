import type { DailyPlanItemResponse, DailyPlanItemStatus, SourceType } from "../api/types";

export const dailyPlanItemGroups: Array<{ source: SourceType; title: string }> = [
  { source: "TASK", title: "Задачи" },
  { source: "HABIT", title: "Привычки" },
  { source: "QUEST", title: "Квесты" },
  { source: "MANUAL", title: "Пункты" }
];

export function countDailyPlanItemStatuses(items: DailyPlanItemResponse[]) {
  return items.reduce<Record<DailyPlanItemStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { PENDING: 0, COMPLETED: 0, FAILED: 0 }
  );
}

export function sortDailyPlanItemsByPlannedTime(items: DailyPlanItemResponse[]) {
  return [...items].sort((a, b) => {
    const left = a.plannedTime || "99:99";
    const right = b.plannedTime || "99:99";
    return left.localeCompare(right) || a.title.localeCompare(b.title, "ru");
  });
}

export function groupDailyPlanItemsBySource(items: DailyPlanItemResponse[]) {
  return dailyPlanItemGroups
    .map((group) => ({ ...group, items: items.filter((item) => item.sourceType === group.source) }))
    .filter((group) => group.items.length > 0);
}

export function dailyPlanCycleLabel(status: DailyPlanItemStatus) {
  if (status === "PENDING") return "Отметить как выполненную";
  if (status === "COMPLETED") return "Отметить как не выполненную";
  return "Вернуть в план";
}
