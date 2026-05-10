import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DailyPlanItemResponse } from "../api/types";
import {
  clampFocusDurationMinutes,
  createFocusTimerTaskSnapshot,
  createIdleFocusTimerState,
  formatFocusOvertime,
  formatFocusTimerTime,
  getFocusTimerActualElapsedSeconds,
  getFocusTimerCreditedSeconds,
  getFocusTimerOvertimeSeconds,
  getFocusTimerPlannedSeconds,
  getFocusTimerRemainingSeconds,
  normalizeFocusTimerState,
  readStoredFocusTimerState,
  type FocusCreditedMode,
  type FocusTimerState,
  writeStoredFocusTimerState
} from "../utils/focusTimerStorage";
import { playFocusTimerCompleteSound, prepareFocusTimerSound } from "../utils/focusTimerSound";

function trimTitleForBrowser(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 42) return trimmed;
  return `${trimmed.slice(0, 39).trim()}...`;
}

function createFocusSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `focus-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useTodayFocusTimer() {
  const [timer, setTimer] = useState<FocusTimerState>(() => readStoredFocusTimerState());
  const [now, setNow] = useState(() => Date.now());
  const originalTitleRef = useRef<string | null>(null);
  const completionSoundPlayedRef = useRef(Boolean(timer.completedAt));

  const remainingSeconds = useMemo(() => getFocusTimerRemainingSeconds(timer, now), [timer, now]);
  const overtimeSeconds = useMemo(() => getFocusTimerOvertimeSeconds(timer, now), [timer, now]);
  const plannedDurationSeconds = useMemo(() => getFocusTimerPlannedSeconds(timer), [timer]);
  const actualElapsedSeconds = useMemo(() => getFocusTimerActualElapsedSeconds(timer, now), [timer, now]);
  const creditedSeconds = useMemo(
    () => getFocusTimerCreditedSeconds(timer, timer.creditedMode ?? "planned", now),
    [timer, now]
  );

  useEffect(() => {
    writeStoredFocusTimerState(timer);
  }, [timer]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    originalTitleRef.current = document.title;
    return () => {
      if (originalTitleRef.current) document.title = originalTitleRef.current;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalTitle = originalTitleRef.current ?? document.title;

    if (timer.savedAt) {
      document.title = originalTitle;
      return;
    }

    if (timer.completedAt && timer.task) {
      document.title = `${formatFocusOvertime(overtimeSeconds)} • Фокус`;
      return;
    }

    if ((timer.status === "running" || timer.status === "paused") && timer.task) {
      document.title = `${formatFocusTimerTime(remainingSeconds)} • ${trimTitleForBrowser(timer.task.title)}`;
      return;
    }

    document.title = originalTitle;
  }, [overtimeSeconds, remainingSeconds, timer.completedAt, timer.savedAt, timer.status, timer.task]);

  useEffect(() => {
    if (timer.status !== "running" && timer.status !== "completed") return undefined;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status !== "running" || remainingSeconds > 0) return;

    const completedAt = Date.now();
    setTimer((current) => {
      if (current.status !== "running") return current;
      return normalizeFocusTimerState({
        ...current,
        savedAt: null
      }, completedAt);
    });

    if (!completionSoundPlayedRef.current) {
      completionSoundPlayedRef.current = true;
      playFocusTimerCompleteSound().catch(() => undefined);
    }
  }, [remainingSeconds, timer.status]);

  const start = useCallback((item: DailyPlanItemResponse, durationMinutes: number) => {
    const startedAt = Date.now();
    const safeMinutes = clampFocusDurationMinutes(durationMinutes);
    completionSoundPlayedRef.current = false;
    prepareFocusTimerSound().catch(() => undefined);
    setNow(startedAt);
    setTimer({
      sessionId: createFocusSessionId(),
      status: "running",
      task: createFocusTimerTaskSnapshot(item),
      durationMinutes: safeMinutes,
      startedAt,
      lastStartedAt: startedAt,
      remainingSeconds: safeMinutes * 60,
      completedAt: null,
      overtimeSeconds: 0,
      creditedMode: "planned",
      savedAt: null
    });
  }, []);

  const pause = useCallback(() => {
    const pausedAt = Date.now();
    setNow(pausedAt);
    setTimer((current) => {
      if (current.status !== "running" && current.status !== "completed") return current;
      const normalized = normalizeFocusTimerState(current, pausedAt);
      if (normalized.completedAt) {
        return {
          ...normalized,
          status: "paused",
          lastStartedAt: null,
          remainingSeconds: 0,
          overtimeSeconds: getFocusTimerOvertimeSeconds(normalized, pausedAt)
        };
      }
      return {
        ...normalized,
        status: "paused",
        lastStartedAt: null,
        remainingSeconds: getFocusTimerRemainingSeconds(normalized, pausedAt)
      };
    });
  }, []);

  const resume = useCallback(() => {
    const resumedAt = Date.now();
    prepareFocusTimerSound().catch(() => undefined);
    setNow(resumedAt);
    setTimer((current) => {
      if (current.status !== "paused") return current;
      if (current.completedAt) {
        return {
          ...current,
          status: "completed",
          lastStartedAt: current.savedAt ? null : resumedAt,
          remainingSeconds: 0
        };
      }
      completionSoundPlayedRef.current = false;
      return {
        ...current,
        status: "running",
        lastStartedAt: resumedAt,
        startedAt: current.startedAt ?? resumedAt,
        remainingSeconds: getFocusTimerRemainingSeconds(current, resumedAt)
      };
    });
  }, []);

  const reset = useCallback(() => {
    completionSoundPlayedRef.current = false;
    setNow(Date.now());
    setTimer(createIdleFocusTimerState());
  }, []);

  const setCreditedMode = useCallback((creditedMode: FocusCreditedMode) => {
    setTimer((current) => ({ ...current, creditedMode }));
  }, []);

  const markSaved = useCallback((sessionId: string) => {
    const savedAt = Date.now();
    setNow(savedAt);
    setTimer((current) => {
      if (current.sessionId !== sessionId) return current;
      return {
        ...current,
        lastStartedAt: null,
        overtimeSeconds: getFocusTimerOvertimeSeconds(current, savedAt),
        savedAt
      };
    });
  }, []);

  return {
    timer,
    remainingSeconds,
    overtimeSeconds,
    plannedDurationSeconds,
    actualElapsedSeconds,
    creditedSeconds,
    start,
    pause,
    resume,
    reset,
    setCreditedMode,
    markSaved
  };
}
