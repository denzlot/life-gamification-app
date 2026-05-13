import type { DailyPlanItemResponse, DailyPlanItemStatus, SourceType } from "../api/types";

export type FocusTimerStatus = "idle" | "running" | "paused" | "completed";
export type FocusCreditedMode = "planned" | "actual";

export interface FocusTimerTaskSnapshot {
  id: number;
  sourceId?: number | null;
  sourceType: SourceType;
  title: string;
  plannedTime?: string | null;
  deadlineTime?: string | null;
  status?: DailyPlanItemStatus | string | null;
}

export interface FocusTimerState {
  sessionId: string | null;
  status: FocusTimerStatus;
  task: FocusTimerTaskSnapshot | null;
  durationMinutes: number;
  startedAt: number | null;
  lastStartedAt: number | null;
  remainingSeconds: number;
  completedAt?: number | null;
  overtimeSeconds?: number;
  creditedMode?: FocusCreditedMode;
  savedAt?: number | null;
}

const STORAGE_KEY = "flowvisior:today-focus-timer";
export const DEFAULT_FOCUS_DURATION_MINUTES = 30;
export const MAX_FOCUS_DURATION_MINUTES = 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isFocusTimerStatus(value: unknown): value is FocusTimerStatus {
  return value === "idle" || value === "running" || value === "paused" || value === "completed";
}

function isFocusCreditedMode(value: unknown): value is FocusCreditedMode {
  return value === "planned" || value === "actual";
}

function readTask(value: unknown): FocusTimerTaskSnapshot | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "number" || typeof value.title !== "string" || typeof value.sourceType !== "string") return null;
  const sourceType = value.sourceType;
  if (sourceType !== "TASK" && sourceType !== "HABIT" && sourceType !== "QUEST" && sourceType !== "MANUAL") return null;

  return {
    id: value.id,
    sourceId: readNullableNumber(value.sourceId),
    sourceType,
    title: value.title,
    plannedTime: typeof value.plannedTime === "string" ? value.plannedTime : null,
    deadlineTime: typeof value.deadlineTime === "string" ? value.deadlineTime : null,
    status: typeof value.status === "string" ? value.status : null
  };
}

export function clampFocusDurationMinutes(value: number) {
  const rounded = Math.round(value || DEFAULT_FOCUS_DURATION_MINUTES);
  return Math.min(MAX_FOCUS_DURATION_MINUTES, Math.max(1, rounded));
}

export function getFocusTimerPlannedSeconds(state: Pick<FocusTimerState, "durationMinutes">) {
  return clampFocusDurationMinutes(state.durationMinutes) * 60;
}

export function createIdleFocusTimerState(): FocusTimerState {
  return {
    sessionId: null,
    status: "idle",
    task: null,
    durationMinutes: DEFAULT_FOCUS_DURATION_MINUTES,
    startedAt: null,
    lastStartedAt: null,
    remainingSeconds: DEFAULT_FOCUS_DURATION_MINUTES * 60,
    completedAt: null,
    overtimeSeconds: 0,
    creditedMode: "planned",
    savedAt: null
  };
}

export function createFocusTimerTaskSnapshot(item: DailyPlanItemResponse): FocusTimerTaskSnapshot {
  return {
    id: item.id,
    sourceId: item.sourceId,
    sourceType: item.sourceType,
    title: item.title,
    plannedTime: item.plannedTime,
    deadlineTime: item.deadlineTime,
    status: item.status
  };
}

export function formatFocusTimerTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function formatFocusTimerDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
  if (hours > 0) return `${hours} ч`;
  if (minutes > 0 && safe < 600 && rest > 0) return `${minutes} мин ${rest} сек`;
  if (minutes > 0) return `${minutes} мин`;
  return `${rest} сек`;
}

export function formatFocusClockDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatFocusOvertime(seconds: number) {
  return `+${formatFocusTimerTime(seconds)}`;
}

export function getFocusTimerRemainingSeconds(state: FocusTimerState, now = Date.now()) {
  if (state.status === "completed") return 0;
  if (state.completedAt) return 0;

  const durationSeconds = getFocusTimerPlannedSeconds(state);
  const baseRemaining = Math.min(durationSeconds, Math.max(0, Math.floor(state.remainingSeconds || durationSeconds)));

  if (state.status !== "running") return baseRemaining;
  const lastStartedAt = state.lastStartedAt ?? state.startedAt;
  if (!lastStartedAt) return baseRemaining;

  const elapsedSeconds = Math.max(0, Math.floor((now - lastStartedAt) / 1000));
  return Math.max(0, baseRemaining - elapsedSeconds);
}

export function getFocusTimerOvertimeSeconds(state: FocusTimerState, now = Date.now()) {
  if (!state.completedAt) return 0;
  const baseOvertime = Math.max(0, Math.floor(state.overtimeSeconds ?? 0));
  if (state.status !== "completed" || !state.lastStartedAt || state.savedAt) return baseOvertime;
  const elapsedSeconds = Math.max(0, Math.floor((now - state.lastStartedAt) / 1000));
  return baseOvertime + elapsedSeconds;
}

export function getFocusTimerActualElapsedSeconds(state: FocusTimerState, now = Date.now()) {
  const plannedSeconds = getFocusTimerPlannedSeconds(state);
  if (state.completedAt) return plannedSeconds + getFocusTimerOvertimeSeconds(state, now);
  return plannedSeconds - getFocusTimerRemainingSeconds(state, now);
}

export function getFocusTimerCreditedSeconds(state: FocusTimerState, mode = state.creditedMode ?? "planned", now = Date.now()) {
  if (mode === "actual") return getFocusTimerActualElapsedSeconds(state, now);
  return getFocusTimerPlannedSeconds(state);
}

export function normalizeFocusTimerState(value: FocusTimerState, now = Date.now()): FocusTimerState {
  const durationMinutes = clampFocusDurationMinutes(value.durationMinutes);
  const durationSeconds = durationMinutes * 60;
  const remainingSeconds = Math.min(durationSeconds, Math.max(0, Math.floor(value.remainingSeconds || durationSeconds)));
  const creditedMode = value.creditedMode ?? "planned";

  if (value.status === "idle" || !value.task) {
    return createIdleFocusTimerState();
  }

  if (value.status === "completed") {
    const overtimeSeconds = getFocusTimerOvertimeSeconds({ ...value, durationMinutes, completedAt: value.completedAt ?? now }, now);
    return {
      ...value,
      status: "completed",
      durationMinutes,
      lastStartedAt: value.savedAt ? null : now,
      remainingSeconds: 0,
      completedAt: value.completedAt ?? now,
      overtimeSeconds,
      creditedMode,
      savedAt: value.savedAt ?? null
    };
  }

  if (value.status === "paused") {
    if (value.completedAt) {
      return {
        ...value,
        status: "paused",
        durationMinutes,
        lastStartedAt: null,
        remainingSeconds: 0,
        completedAt: value.completedAt,
        overtimeSeconds: Math.max(0, Math.floor(value.overtimeSeconds ?? 0)),
        creditedMode,
        savedAt: value.savedAt ?? null
      };
    }

    if (remainingSeconds <= 0) {
      return {
        ...value,
        status: "paused",
        durationMinutes,
        lastStartedAt: null,
        remainingSeconds: 0,
        completedAt: value.completedAt ?? now,
        overtimeSeconds: Math.max(0, Math.floor(value.overtimeSeconds ?? 0)),
        creditedMode,
        savedAt: value.savedAt ?? null
      };
    }

    return { ...value, durationMinutes, lastStartedAt: null, remainingSeconds, overtimeSeconds: 0, creditedMode, savedAt: value.savedAt ?? null };
  }

  const lastStartedAt = value.lastStartedAt ?? value.startedAt;
  const elapsedSeconds = lastStartedAt ? Math.max(0, Math.floor((now - lastStartedAt) / 1000)) : 0;

  if (elapsedSeconds >= remainingSeconds) {
    const completedAt = lastStartedAt ? lastStartedAt + remainingSeconds * 1000 : now;
    return {
      ...value,
      status: "completed",
      durationMinutes,
      lastStartedAt: now,
      remainingSeconds: 0,
      completedAt: value.completedAt ?? completedAt,
      overtimeSeconds: Math.max(0, elapsedSeconds - remainingSeconds),
      creditedMode,
      savedAt: value.savedAt ?? null
    };
  }

  return {
    ...value,
    status: "running",
    durationMinutes,
    lastStartedAt: now,
    remainingSeconds: remainingSeconds - elapsedSeconds,
    completedAt: null,
    overtimeSeconds: 0,
    creditedMode,
    savedAt: value.savedAt ?? null
  };
}

export function readStoredFocusTimerState(now = Date.now()): FocusTimerState {
  if (typeof window === "undefined") return createIdleFocusTimerState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createIdleFocusTimerState();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createIdleFocusTimerState();

    const status = isFocusTimerStatus(parsed.status) ? parsed.status : "idle";
    const durationMinutes = clampFocusDurationMinutes(readNumber(parsed.durationMinutes, DEFAULT_FOCUS_DURATION_MINUTES));
    const fallbackRemaining = durationMinutes * 60;
    const state: FocusTimerState = {
      status,
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : null,
      task: readTask(parsed.task),
      durationMinutes,
      startedAt: readNullableNumber(parsed.startedAt),
      lastStartedAt: readNullableNumber(parsed.lastStartedAt),
      remainingSeconds: readNumber(parsed.remainingSeconds, fallbackRemaining),
      completedAt: readNullableNumber(parsed.completedAt),
      overtimeSeconds: readNumber(parsed.overtimeSeconds, 0),
      creditedMode: isFocusCreditedMode(parsed.creditedMode) ? parsed.creditedMode : "planned",
      savedAt: readNullableNumber(parsed.savedAt)
    };
    return normalizeFocusTimerState(state, now);
  } catch {
    return createIdleFocusTimerState();
  }
}

export function writeStoredFocusTimerState(state: FocusTimerState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Focus state is convenience-only; storage can be unavailable in private mode.
  }
}
