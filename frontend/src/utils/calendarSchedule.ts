import type { QuestResponse, QuestStepResponse } from "../api/types";

export const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export type CalendarDisplayMode = "clean" | "workload" | "rewards" | "full";

export interface QuestDayStats {
  total: number;
  completed: number;
  skipped: number;
  pending: number;
}

export interface PaceInfo {
  tone: "behind" | "ahead" | "even";
  behind: number;
  ahead: number;
  expectedToday: number;
  needDate: string | null;
  needCount: number;
}

export function addMonths(date: Date, diff: number) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

export function addDays(date: string, delta: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  return next.toISOString().slice(0, 10);
}

export function shiftedWeekdays(cursor: Date) {
  const firstDayIndex = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => weekdays[(firstDayIndex + index) % 7]);
}

export function shortStepWord(count: number) {
  const abs = Math.abs(count);
  if (abs % 10 === 1 && abs % 100 !== 11) return "шаг";
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return "шага";
  return "шагов";
}

export function questDayLabel(total: number, completed: number, dayDate: string, today: string) {
  if (total === 0) return "";
  if (dayDate < today) return `${completed}/${total}`;
  return `${total} ${shortStepWord(total)}`;
}

export function groupQuestSteps(steps: QuestStepResponse[]) {
  return steps.reduce<Record<string, QuestDayStats>>((acc, step) => {
    const entry = acc[step.scheduledDate] ?? { total: 0, completed: 0, skipped: 0, pending: 0 };
    entry.total += 1;
    if (step.status === "COMPLETED") entry.completed += 1;
    else if (step.status === "SKIPPED") entry.skipped += 1;
    else entry.pending += 1;
    acc[step.scheduledDate] = entry;
    return acc;
  }, {});
}

export function dateDiffDays(left: string, right: string) {
  const a = new Date(`${left}T12:00:00`).getTime();
  const b = new Date(`${right}T12:00:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function dayWeight(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 || day === 6 ? 1.35 : 1;
}

const routeScheduleCache = new Map<string, string[]>();

export function plannedDatesForQuest(quest: QuestResponse) {
  const safeDuration = Math.max(1, quest.durationDays);
  const safeSteps = Math.max(1, quest.totalSteps);
  const cacheKey = `${quest.id}:${quest.startDate}:${safeDuration}:${safeSteps}`;
  const cached = routeScheduleCache.get(cacheKey);
  if (cached) return cached;

  const quotas = Array.from({ length: safeDuration }, () => 0);

  if (safeSteps <= safeDuration) {
    for (let index = 0; index < safeSteps; index += 1) {
      const offset = safeSteps === 1 ? 0 : Math.round((index * (safeDuration - 1)) / (safeSteps - 1));
      quotas[offset] += 1;
    }
  } else {
    quotas.fill(1);
    let extraSteps = safeSteps - safeDuration;

    while (extraSteps > 0) {
      let bestOffset = 0;
      let bestPressure = Number.POSITIVE_INFINITY;

      for (let offset = 0; offset < safeDuration; offset += 1) {
        const pressure = quotas[offset] / dayWeight(addDays(quest.startDate, offset));
        if (pressure < bestPressure) {
          bestPressure = pressure;
          bestOffset = offset;
        }
      }

      quotas[bestOffset] += 1;
      extraSteps -= 1;
    }
  }

  const result: string[] = [];
  quotas.forEach((count, offset) => {
    for (let step = 0; step < count; step += 1) {
      result.push(addDays(quest.startDate, offset));
    }
  });

  routeScheduleCache.set(cacheKey, result);
  if (routeScheduleCache.size > 50) {
    const firstKey = routeScheduleCache.keys().next().value;
    if (firstKey) routeScheduleCache.delete(firstKey);
  }
  return result;
}

export function plannedDateForStep(quest: QuestResponse, stepNumber: number) {
  const dates = plannedDatesForQuest(quest);
  const safeIndex = Math.min(Math.max(stepNumber - 1, 0), dates.length - 1);
  return dates[safeIndex] ?? quest.startDate;
}

export function expectedStepsByDate(quest: QuestResponse, date: string) {
  let expected = 0;
  for (let stepNumber = 1; stepNumber <= quest.totalSteps; stepNumber += 1) {
    if (plannedDateForStep(quest, stepNumber) <= date) expected += 1;
  }
  return expected;
}

export function baseQuotaForDate(quest: QuestResponse, date: string) {
  let planned = 0;
  for (let stepNumber = 1; stepNumber <= quest.totalSteps; stepNumber += 1) {
    if (plannedDateForStep(quest, stepNumber) === date) planned += 1;
  }
  return Math.max(1, planned);
}

export function computePace(quest: QuestResponse | null, steps: QuestStepResponse[], grouped: Record<string, QuestDayStats>, today: string): PaceInfo {
  if (!quest) return { tone: "even", behind: 0, ahead: 0, expectedToday: 0, needDate: null, needCount: 0 };

  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const expectedToday = expectedStepsByDate(quest, today);
  const expectedBeforeToday = expectedStepsByDate(quest, addDays(today, -1));
  const overduePendingDebt = steps.filter((step) => step.status === "PENDING" && step.scheduledDate < today).length;
  const legacySkippedDebt = steps.filter((step) => step.status === "SKIPPED" && step.scheduledDate <= today).length;
  const lateDebt = Math.max(overduePendingDebt + legacySkippedDebt, Math.max(0, expectedBeforeToday - completed));

  let needDate: string | null = null;
  let needCount = 0;

  const pressureDates = Object.keys(grouped)
    .filter((date) => {
      const stats = grouped[date];
      if (date < today || stats.pending === 0) return false;
      return lateDebt > 0 || stats.total > baseQuotaForDate(quest, date);
    })
    .sort();

  if (pressureDates.length > 0) {
    needDate = pressureDates[0];
    const stats = grouped[needDate];
    needCount = Math.max(stats.total, baseQuotaForDate(quest, needDate) + lateDebt);
  } else if (lateDebt > 0) {
    needDate = addDays(today, 1);
    needCount = Math.max(1, lateDebt);
  }

  const recoveryDebt = needDate ? Math.max(0, needCount - baseQuotaForDate(quest, needDate)) : 0;
  const behind = Math.max(lateDebt, recoveryDebt);
  const ahead = Math.max(0, completed - expectedToday);
  const tone = behind > 0 ? "behind" : ahead > 0 ? "ahead" : "even";

  return { tone, behind, ahead, expectedToday, needDate, needCount };
}

export function dayLink(date: string, today: string) {
  return date === today ? "/today" : `/calendar/${date}`;
}
