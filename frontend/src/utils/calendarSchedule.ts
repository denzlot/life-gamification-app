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

export function baselineDateForStep(step: QuestStepResponse) {
  return step.baselineScheduledDate ?? step.scheduledDate;
}

export function plannedDateForStep(steps: QuestStepResponse[], stepNumber: number) {
  const step = steps.find((item) => item.stepNumber === stepNumber);
  return step ? baselineDateForStep(step) : null;
}

export function expectedStepsByDate(steps: QuestStepResponse[], date: string) {
  return steps.filter((step) => baselineDateForStep(step) <= date).length;
}

export function baseQuotaForDate(steps: QuestStepResponse[], date: string) {
  const planned = steps.filter((step) => baselineDateForStep(step) === date).length;
  return Math.max(1, planned);
}

export function computePace(quest: QuestResponse | null, steps: QuestStepResponse[], grouped: Record<string, QuestDayStats>, today: string): PaceInfo {
  if (!quest || steps.length === 0) return { tone: "even", behind: 0, ahead: 0, expectedToday: 0, needDate: null, needCount: 0 };

  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const expectedToday = expectedStepsByDate(steps, today);
  const expectedBeforeToday = expectedStepsByDate(steps, addDays(today, -1));
  const overduePendingDebt = steps.filter((step) => step.status === "PENDING" && step.scheduledDate < today).length;
  const legacySkippedDebt = steps.filter((step) => step.status === "SKIPPED" && baselineDateForStep(step) <= today).length;
  const lateDebt = Math.max(overduePendingDebt + legacySkippedDebt, Math.max(0, expectedBeforeToday - completed));

  let needDate: string | null = null;
  let needCount = 0;

  const pressureDates = Object.keys(grouped)
    .filter((date) => {
      const stats = grouped[date];
      if (date < today || stats.pending === 0) return false;
      return lateDebt > 0 || stats.total > baseQuotaForDate(steps, date);
    })
    .sort();

  if (pressureDates.length > 0) {
    needDate = pressureDates[0];
    const stats = grouped[needDate];
    needCount = Math.max(stats.total, baseQuotaForDate(steps, needDate) + lateDebt);
  } else if (lateDebt > 0) {
    needDate = addDays(today, 1);
    needCount = Math.max(1, lateDebt);
  }

  const recoveryDebt = needDate ? Math.max(0, needCount - baseQuotaForDate(steps, needDate)) : 0;
  const behind = Math.max(lateDebt, recoveryDebt);
  const ahead = Math.max(0, completed - expectedToday);
  const tone = behind > 0 ? "behind" : ahead > 0 ? "ahead" : "even";

  return { tone, behind, ahead, expectedToday, needDate, needCount };
}

export function dayLink(date: string, today: string) {
  return date === today ? "/today" : `/calendar/${date}`;
}
