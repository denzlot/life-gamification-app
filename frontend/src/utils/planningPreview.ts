import type {
  CalendarDayResponse,
  DailyPlanItemResponse,
  HabitResponse,
  QuestStepResponse,
  TaskResponse
} from "../api/types";
import { todayISO } from "./format";

export interface PlanningCatalog {
  tasks: TaskResponse[];
  habits: HabitResponse[];
  questSteps: QuestStepResponse[];
}

export interface PlannedDayStats {
  totalCount: number;
  taskCount: number;
  habitCount: number;
  questCount: number;
  completedCount: number;
  taskCompletedCount: number;
  habitCompletedCount: number;
  questCompletedCount: number;
}

const emptyStats: PlannedDayStats = {
  totalCount: 0,
  taskCount: 0,
  habitCount: 0,
  questCount: 0,
  completedCount: 0,
  taskCompletedCount: 0,
  habitCompletedCount: 0,
  questCompletedCount: 0
};

function weekdayIndex(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function daysBetween(startDate: string, endDate: string) {
  const start = dateParts(startDate);
  const end = dateParts(endDate);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endUtc - startUtc) / 86_400_000);
}

function activeTaskForDate(task: TaskResponse, date: string) {
  const status = String(task.status).toUpperCase();
  return task.deadlineDate === date && status !== "COMPLETED" && status !== "FAILED";
}

function habitWorksOnDate(habit: HabitResponse, date: string) {
  if (!habit.active) return false;
  if (habit.scheduleType === "MONTHLY") {
    if (!habit.monthlyDay) return false;
    const { year, month, day } = dateParts(date);
    const lastDay = new Date(year, month, 0).getDate();
    return day === Math.min(habit.monthlyDay, lastDay);
  }
  if (habit.scheduleType === "INTERVAL") {
    if (!habit.intervalDays || !habit.intervalStartDate || date < habit.intervalStartDate) return false;
    return daysBetween(habit.intervalStartDate, date) % habit.intervalDays === 0;
  }
  const schedule = habit.scheduleDays?.length ? habit.scheduleDays : [1, 2, 3, 4, 5, 6, 7];
  return schedule.includes(weekdayIndex(date));
}

function questItemStatus(step: QuestStepResponse): DailyPlanItemResponse["status"] {
  if (step.status === "COMPLETED") return "COMPLETED";
  if (step.status === "SKIPPED") return "FAILED";
  return "PENDING";
}

export function buildPreviewItems(date: string, catalog: PlanningCatalog): DailyPlanItemResponse[] {
  if (date < todayISO()) return [];

  const taskItems = catalog.tasks
    .filter((task) => activeTaskForDate(task, date))
    .map<DailyPlanItemResponse>((task) => ({
      id: -1_000_000 - task.id,
      sourceType: "TASK",
      sourceId: task.id,
      title: task.title,
      description: task.description ?? null,
      plannedTime: task.plannedTime ?? null,
      deadlineTime: task.deadlineTime ?? null,
      status: "PENDING",
      xpReward: 0,
      hpDeltaComplete: 0,
      hpDeltaFail: 0,
      createdAt: task.createdAt,
      completedAt: null
    }));

  const habitItems = catalog.habits
    .filter((habit) => habitWorksOnDate(habit, date))
    .map<DailyPlanItemResponse>((habit) => ({
      id: -2_000_000 - habit.id,
      sourceType: "HABIT",
      sourceId: habit.id,
      title: habit.title,
      description: habit.description ?? null,
      plannedTime: habit.plannedTime ?? null,
      deadlineTime: habit.deadlineTime ?? null,
      status: "PENDING",
      xpReward: 0,
      hpDeltaComplete: 0,
      hpDeltaFail: 0,
      createdAt: habit.createdAt,
      completedAt: null
    }));

  const questItems = catalog.questSteps
    .filter((step) => step.scheduledDate === date)
    .map<DailyPlanItemResponse>((step) => ({
      id: -3_000_000 - step.id,
      sourceType: "QUEST",
      sourceId: step.id,
      title: step.title,
      description: step.description ?? null,
      plannedTime: step.plannedTime ?? null,
      deadlineTime: step.deadlineTime ?? null,
      status: questItemStatus(step),
      xpReward: 0,
      hpDeltaComplete: 0,
      hpDeltaFail: 0,
      createdAt: step.createdAt,
      completedAt: step.completedAt ?? null
    }));

  return [...taskItems, ...habitItems, ...questItems].sort((left, right) => {
    const leftTime = left.plannedTime || "99:99";
    const rightTime = right.plannedTime || "99:99";
    return leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title, "ru");
  });
}

export function summarizePreviewItems(items: DailyPlanItemResponse[]): PlannedDayStats {
  return items.reduce<PlannedDayStats>((acc, item) => {
    acc.totalCount += 1;
    if (item.status === "COMPLETED") acc.completedCount += 1;

    if (item.sourceType === "TASK") {
      acc.taskCount += 1;
      if (item.status === "COMPLETED") acc.taskCompletedCount += 1;
    }
    if (item.sourceType === "HABIT") {
      acc.habitCount += 1;
      if (item.status === "COMPLETED") acc.habitCompletedCount += 1;
    }
    if (item.sourceType === "QUEST") {
      acc.questCount += 1;
      if (item.status === "COMPLETED") acc.questCompletedCount += 1;
    }
    return acc;
  }, { ...emptyStats });
}

export function overlayCalendarDay(day: CalendarDayResponse, catalog: PlanningCatalog): CalendarDayResponse {
  if (day.date < todayISO()) return day;

  const preview = buildPreviewItems(day.date, catalog);
  const projected = summarizePreviewItems(preview);

  if (projected.totalCount === 0 || day.status === "CLOSED") return day;

  const useProjected = day.status === "EMPTY" || projected.totalCount > day.totalCount;
  if (!useProjected) return day;

  return {
    ...day,
    status: day.status === "EMPTY" ? "PLANNED" : day.status,
    totalCount: projected.totalCount,
    completedCount: Math.max(day.completedCount, projected.completedCount),
    taskCount: projected.taskCount,
    habitCount: projected.habitCount,
    questCount: projected.questCount,
    taskCompletedCount: Math.max(day.taskCompletedCount ?? 0, projected.taskCompletedCount),
    habitCompletedCount: Math.max(day.habitCompletedCount ?? 0, projected.habitCompletedCount),
    questCompletedCount: Math.max(day.questCompletedCount ?? 0, projected.questCompletedCount)
  };
}
