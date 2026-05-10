import type { CSSProperties } from "react";
import {
  clampFocusDurationMinutes,
  formatFocusOvertime,
  formatFocusTimerTime,
  type FocusTimerState
} from "../../utils/focusTimerStorage";
import { Button } from "../Button";

interface TodayFocusWidgetProps {
  timer: FocusTimerState;
  remainingSeconds: number;
  overtimeSeconds: number;
  onOpen: () => void;
  onPause: () => void;
  onResume: () => void;
}

function progressPercent(timer: FocusTimerState, remainingSeconds: number) {
  if (timer.completedAt || timer.status === "completed") return 100;
  const durationSeconds = Math.max(1, clampFocusDurationMinutes(timer.durationMinutes) * 60);
  return Math.min(100, Math.max(0, ((durationSeconds - remainingSeconds) / durationSeconds) * 100));
}

export function TodayFocusWidget({
  timer,
  remainingSeconds,
  overtimeSeconds,
  onOpen,
  onPause,
  onResume
}: TodayFocusWidgetProps) {
  if ((timer.status !== "running" && timer.status !== "paused" && timer.status !== "completed") || !timer.task) return null;

  const progressStyle = { "--focus-progress": `${progressPercent(timer, remainingSeconds)}%` } as CSSProperties;
  const isOvertime = Boolean(timer.completedAt);
  const timeLabel = isOvertime ? formatFocusOvertime(overtimeSeconds) : formatFocusTimerTime(remainingSeconds);
  const actionLabel = timer.status === "paused" ? "Продолжить" : "Пауза";
  const action = timer.status === "paused" ? onResume : onPause;

  return (
    <div className={`today-focus-widget status-${timer.status} ${isOvertime ? "is-overtime" : ""}`} style={progressStyle} role="status">
      <div className="today-focus-widget-main" title={timer.task.title}>
        <strong>{timer.savedAt ? "Фокус сохранён:" : isOvertime ? "Фокус overtime:" : "Фокус:"}</strong> {timer.task.title} <span>· {timer.savedAt ? "сессия сохранена" : timeLabel}</span>
      </div>
      <div className="today-focus-widget-actions">
        <Button type="button" variant="thin" onClick={onOpen}>Открыть</Button>
        {!timer.savedAt ? <Button type="button" variant="ghost" onClick={action}>{actionLabel}</Button> : null}
      </div>
      <span className="today-focus-widget-progress" aria-hidden="true" />
    </div>
  );
}
