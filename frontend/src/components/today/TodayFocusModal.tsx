import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import type { DailyPlanItemResponse, DailyPlanItemStatus, SourceType } from "../../api/types";
import {
  DEFAULT_FOCUS_DURATION_MINUTES,
  MAX_FOCUS_DURATION_MINUTES,
  clampFocusDurationMinutes,
  formatFocusClockDuration,
  formatFocusOvertime,
  formatFocusTimerDuration,
  formatFocusTimerTime,
  type FocusCreditedMode,
  type FocusTimerState,
  type FocusTimerTaskSnapshot
} from "../../utils/focusTimerStorage";
import { formatTime } from "../../utils/format";
import { Button } from "../Button";
import { Field, NumberWheelInput } from "../FormFields";
import { FormModal } from "../FormModal";
import { StatusCycleIcon } from "../StatusCycleIcon";

interface TodayFocusModalProps {
  items: DailyPlanItemResponse[];
  timer: FocusTimerState;
  remainingSeconds: number;
  overtimeSeconds: number;
  plannedDurationSeconds: number;
  actualElapsedSeconds: number;
  canCompleteItem: boolean;
  completingItemId: number | null;
  onStart: (item: DailyPlanItemResponse, durationMinutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onChangeCreditedMode: (mode: FocusCreditedMode) => void;
  onCompleteItem: (item: DailyPlanItemResponse, creditedMode: FocusCreditedMode) => void;
  onClose: () => void;
}

const focusTypeFilters: Array<{ value: SourceType | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "TASK", label: "Задачи" },
  { value: "HABIT", label: "Привычки" },
  { value: "QUEST", label: "Квесты" }
];

const focusTypeOrder: Record<SourceType, number> = {
  TASK: 0,
  HABIT: 1,
  QUEST: 2,
  MANUAL: 3
};

function isPending(item: DailyPlanItemResponse) {
  return item.status === "PENDING";
}

function isFinished(item: DailyPlanItemResponse) {
  return item.status === "COMPLETED" || item.status === "FAILED";
}

function itemTimeLabel(item: Pick<DailyPlanItemResponse, "plannedTime" | "deadlineTime">) {
  const values = [
    item.plannedTime ? formatTime(item.plannedTime) : null,
    item.deadlineTime ? `дедлайн ${formatTime(item.deadlineTime)}` : null
  ].filter(Boolean);
  return values.join(" · ");
}

function sortFocusItems(items: DailyPlanItemResponse[]) {
  return [...items].sort((a, b) => {
    const byCompletion = Number(isFinished(a)) - Number(isFinished(b));
    if (byCompletion !== 0) return byCompletion;
    const byType = focusTypeOrder[a.sourceType] - focusTypeOrder[b.sourceType];
    if (byType !== 0) return byType;
    const leftTime = a.plannedTime || "99:99";
    const rightTime = b.plannedTime || "99:99";
    return leftTime.localeCompare(rightTime) || a.title.localeCompare(b.title, "ru");
  });
}

function progressPercent(timer: FocusTimerState, remainingSeconds: number) {
  if (timer.status === "idle") return 0;
  if (timer.completedAt || timer.status === "completed") return 100;
  const durationSeconds = Math.max(1, clampFocusDurationMinutes(timer.durationMinutes) * 60);
  return Math.min(100, Math.max(0, ((durationSeconds - remainingSeconds) / durationSeconds) * 100));
}

function normalizedDailyPlanStatus(status?: DailyPlanItemStatus | string | null): DailyPlanItemStatus {
  return status === "COMPLETED" || status === "FAILED" ? status : "PENDING";
}

function statusClass(status?: DailyPlanItemStatus | string | null) {
  return `status-${normalizedDailyPlanStatus(status).toLowerCase()}`;
}

function statusCycleClass(status?: DailyPlanItemStatus | string | null) {
  return `status-cycle-${normalizedDailyPlanStatus(status).toLowerCase()}`;
}

function taskMeta(task: Pick<DailyPlanItemResponse, "plannedTime" | "deadlineTime"> | FocusTimerTaskSnapshot) {
  return itemTimeLabel(task);
}


export function TodayFocusModal({
  items,
  timer,
  remainingSeconds,
  overtimeSeconds,
  plannedDurationSeconds,
  actualElapsedSeconds,
  canCompleteItem,
  completingItemId,
  onStart,
  onPause,
  onResume,
  onReset,
  onChangeCreditedMode,
  onCompleteItem,
  onClose
}: TodayFocusModalProps) {
  const focusItems = useMemo(() => sortFocusItems(items.filter(isPending)), [items]);
  const [typeFilter, setTypeFilter] = useState<SourceType | "ALL">("ALL");
  const filteredItems = useMemo(
    () => focusItems.filter((item) => typeFilter === "ALL" || item.sourceType === typeFilter),
    [focusItems, typeFilter]
  );
  const [selectedItemId, setSelectedItemId] = useState<number | null>(filteredItems[0]?.id ?? null);
  const [durationMinutesDraft, setDurationMinutesDraft] = useState(DEFAULT_FOCUS_DURATION_MINUTES);

  useEffect(() => {
    if (timer.status !== "idle") return;
    setSelectedItemId((current) => {
      if (current && filteredItems.some((item) => item.id === current)) return current;
      return filteredItems[0]?.id ?? null;
    });
  }, [filteredItems, timer.status]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedItem = filteredItems.find((item) => item.id === selectedItemId);
    if (!selectedItem || !isPending(selectedItem)) return;
    const durationMinutes = clampFocusDurationMinutes(durationMinutesDraft);
    setDurationMinutesDraft(durationMinutes);
    onStart(selectedItem, durationMinutes);
  }

  function requestReset() {
    const needsConfirm = timer.status === "running" || timer.status === "paused" || (timer.status === "completed" && !timer.savedAt);
    if (needsConfirm && !window.confirm("Сбросить фокус-сессию?")) return;
    onReset();
  }

  const activeTask = timer.task;
  const currentActiveItem = activeTask ? items.find((item) => item.id === activeTask.id) ?? null : null;
  const displayTask = currentActiveItem ?? activeTask;
  const displayTaskMeta = displayTask ? taskMeta(displayTask) : "";
  const progress = progressPercent(timer, remainingSeconds);
  const progressStyle = { "--focus-progress": `${progress}%` } as CSSProperties;
  const roundedProgress = Math.round(progress);
  const isOvertime = Boolean(timer.completedAt);
  const isPausedBeforePlan = timer.status === "paused" && !timer.completedAt;
  const creditedMode = timer.creditedMode ?? "planned";
  const creditedSeconds = creditedMode === "actual" ? actualElapsedSeconds : plannedDurationSeconds;
  const canMarkCompleted = Boolean(
    currentActiveItem
    && currentActiveItem.status === "PENDING"
    && canCompleteItem
    && !timer.savedAt
  );
  const completeButtonLabel = timer.savedAt
    ? "Сессия сохранена"
    : !currentActiveItem
      ? "Задача не найдена"
      : currentActiveItem.status === "COMPLETED"
        ? "Уже выполнено"
        : currentActiveItem.status === "FAILED"
          ? "Пункт уже не выполнен"
          : canCompleteItem
          ? "Отметить выполненной"
          : "День закрыт";
  const sessionTimeLabel = isOvertime
    ? formatFocusOvertime(overtimeSeconds)
    : isPausedBeforePlan
      ? formatFocusClockDuration(actualElapsedSeconds)
      : formatFocusTimerTime(remainingSeconds);
  const sessionProgressLabel = isOvertime
    ? "сверх плана"
    : isPausedBeforePlan
      ? "потрачено"
      : timer.status === "paused"
        ? "пауза"
        : `${roundedProgress}%`;

  function renderFocusActionRow(mode: FocusCreditedMode, pendingMeta: string, actionLabel = completeButtonLabel) {
    if (!displayTask) return null;
    const rowActionLabel = completingItemId === currentActiveItem?.id ? "Сохраняю..." : actionLabel;

    return (
      <article className={`line-item focus-complete-plan-row ${statusClass(displayTask.status)}`}>
        <button
          type="button"
          className={`status-cycle ${statusCycleClass(displayTask.status)}`}
          disabled={!canMarkCompleted || completingItemId === currentActiveItem?.id}
          onClick={() => currentActiveItem && onCompleteItem(currentActiveItem, mode)}
          aria-label={`${rowActionLabel}: ${displayTask.title}`}
        >
          <StatusCycleIcon status={normalizedDailyPlanStatus(displayTask.status)} />
        </button>
        <div className="todo-main">
          <strong className="editable-title is-readonly">{displayTask.title}</strong>
          <p className="muted compact-meta">{timer.savedAt ? "Focus-время сохранено" : pendingMeta}</p>
        </div>
        <Button
          type="button"
          variant="thin"
          disabled={!canMarkCompleted || completingItemId === currentActiveItem?.id}
          onClick={() => currentActiveItem && onCompleteItem(currentActiveItem, mode)}
        >
          {completingItemId === currentActiveItem?.id ? "Сохраняю..." : actionLabel}
        </Button>
      </article>
    );
  }

  return (
    <FormModal onClose={onClose}>
      {timer.status === "idle" ? (
        <form
          className="form-grid focus-modal-card modal-form-card"
          onSubmit={handleSubmit}
          role="dialog"
          aria-modal="true"
          aria-label="Фокус"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-form-head">
            <div><p className="eyebrow">фокус</p><strong>Выбери задачу для сессии</strong></div>
            <button type="button" className="dialog-close" onClick={onClose} aria-label="Закрыть">×</button>
          </div>

          <div className="filter-row focus-filter-row" aria-label="Фильтр focus-задач">
            {focusTypeFilters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={typeFilter === filter.value ? "active" : ""}
                onClick={() => setTypeFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredItems.length > 0 ? (
            <div className="focus-task-list" role="listbox" aria-label="Задачи для фокуса">
              {filteredItems.map((item) => {
                const time = itemTimeLabel(item);
                const selected = item.id === selectedItemId;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`focus-task-option ${selected ? "selected" : ""} ${isFinished(item) ? "is-muted" : ""}`}
                    onClick={() => setSelectedItemId(item.id)}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className="focus-task-option-main">
                      <strong>{item.title}</strong>
                    </span>
                    {time ? <span className="focus-task-option-meta">{time}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="focus-modal-empty muted">В daily plan пока нет доступных задач для фокуса.</p>
          )}

          <Field label="Время фокус-сессии" hint="Выбери длительность в минутах, без пресетов.">
            <div className="focus-duration-wheel">
              <NumberWheelInput
                value={durationMinutesDraft}
                min={1}
                max={MAX_FOCUS_DURATION_MINUTES}
                suffix="мин"
                label="выбрать минуты"
                placeholder="30 мин"
                onChange={(value) => setDurationMinutesDraft(clampFocusDurationMinutes(value))}
              />
            </div>
          </Field>

          <div className="form-actions">
            <Button type="submit" disabled={selectedItemId === null}>Запуск</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Закрыть</Button>
          </div>
        </form>
      ) : (
        <div
          className={`focus-modal-card focus-session-card modal-form-card status-${timer.status} ${isOvertime ? "is-overtime" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Фокус"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-form-head">
            <div>
              <p className="eyebrow">{isOvertime ? "дополнительное время" : isPausedBeforePlan ? "фокус на паузе" : "фокус-сессия"}</p>
              <strong>{isOvertime ? "Плановое время истекло" : isPausedBeforePlan ? "Пауза" : "Активный фокус"}</strong>
            </div>
            <button type="button" className="dialog-close" onClick={onClose} aria-label="Закрыть">×</button>
          </div>

          <div className="focus-session-panel">
            <div
              className="focus-progress-ring"
              style={progressStyle}
              role="progressbar"
              aria-label="Прогресс фокус-сессии"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={roundedProgress}
            >
              <div className="focus-progress-core">
                <span className="focus-time-left">{sessionTimeLabel}</span>
                <span className="focus-progress-label">{sessionProgressLabel}</span>
              </div>
            </div>

            {!isOvertime && !isPausedBeforePlan && displayTask ? (
              <div className="focus-active-task-card">
                <p className="eyebrow">выбрана задача</p>
                <strong>{displayTask.title}</strong>
                {displayTaskMeta ? <span className="focus-active-task-meta">{displayTaskMeta}</span> : null}
              </div>
            ) : null}

            {isPausedBeforePlan ? (
              <div className="focus-complete-prompt focus-pause-prompt">
                <div className="focus-complete-copy">
                  <strong>Фокус на паузе.</strong>
                  <p className="muted">Можно продолжить таймер или завершить задачу сейчас с уже потраченным временем.</p>
                </div>

                <div className="focus-plan-summary" aria-label="Потраченное время фокус-сессии">
                  <span>Потрачено</span>
                  <strong>{formatFocusClockDuration(actualElapsedSeconds)}</strong>
                </div>

                {renderFocusActionRow(
                  "actual",
                  `Будет засчитано: ${formatFocusClockDuration(actualElapsedSeconds)}`,
                  canMarkCompleted ? "Завершить сейчас" : completeButtonLabel
                )}
              </div>
            ) : null}

            {isOvertime ? (
              <div className="focus-complete-prompt">
                <div className="focus-complete-copy">
                  <strong>Плановое время закончилось.</strong>
                  <p className="muted">Таймер продолжает считать время сверх плана, пока сессия не будет поставлена на паузу или сброшена.</p>
                </div>

                <div className="focus-plan-summary" aria-label="Плановое время фокус-сессии">
                  <span>План</span>
                  <strong>{formatFocusTimerDuration(plannedDurationSeconds)}</strong>
                </div>

                <div className="focus-credit-choice" aria-label="Выбор времени для зачёта">
                  <button
                    type="button"
                    className={creditedMode === "planned" ? "selected" : ""}
                    onClick={() => onChangeCreditedMode("planned")}
                  >
                    <span>Засчитать план</span>
                    <strong>{formatFocusTimerDuration(plannedDurationSeconds)}</strong>
                  </button>
                  <button
                    type="button"
                    className={creditedMode === "actual" ? "selected" : ""}
                    onClick={() => onChangeCreditedMode("actual")}
                  >
                    <span>Засчитать всё время</span>
                    <strong>{formatFocusTimerDuration(actualElapsedSeconds)}</strong>
                  </button>
                </div>

                {renderFocusActionRow(
                  creditedMode,
                  `Будет засчитано: ${formatFocusClockDuration(creditedSeconds)}`
                )}
              </div>
            ) : null}
          </div>

          <div className="form-actions">
            {timer.status === "running" || (timer.status === "completed" && !timer.savedAt) ? <Button type="button" variant="thin" onClick={onPause}>Пауза</Button> : null}
            {timer.status === "paused" && !timer.savedAt ? <Button type="button" variant="thin" onClick={onResume}>Продолжить</Button> : null}
            <Button type="button" variant="ghost" onClick={requestReset}>Сбросить</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Закрыть окно</Button>
          </div>
        </div>
      )}
    </FormModal>
  );
}
