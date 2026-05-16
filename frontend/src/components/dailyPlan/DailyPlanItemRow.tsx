import type { KeyboardEvent } from "react";
import type { DailyPlanItemResponse } from "../../api/types";
import { formatTime } from "../../utils/format";
import { formatFocusClockDuration } from "../../utils/focusTimerStorage";
import { dailyPlanCycleLabel } from "../../utils/dailyPlanItems";
import { TextInput } from "../FormFields";
import { StatusCycleButton } from "../StatusCycleButton";

interface DailyPlanItemRowProps {
  item: DailyPlanItemResponse;
  busyItemId: number | null;
  editingId: number | null;
  editTitle: string;
  openDescriptionId: number | null;
  canChangeStatus: boolean;
  canEditTitle?: boolean;
  setEditTitle: (value: string) => void;
  onCycle: (item: DailyPlanItemResponse) => void;
  onToggleDescription: (id: number) => void;
  onBeginEdit: (item: DailyPlanItemResponse) => void;
  onSaveTitle: (item: DailyPlanItemResponse) => void;
  onTitleKey: (event: KeyboardEvent<HTMLInputElement>, item: DailyPlanItemResponse) => void;
}

/** Shared daily-plan row used by Today and Day Details. Keep class names stable for legacy CSS. */
export function DailyPlanItemRow({
  item,
  busyItemId,
  editingId,
  editTitle,
  openDescriptionId,
  canChangeStatus,
  canEditTitle = canChangeStatus,
  setEditTitle,
  onCycle,
  onToggleDescription,
  onBeginEdit,
  onSaveTitle,
  onTitleKey
}: DailyPlanItemRowProps) {
  const isEditing = editingId === item.id;
  const isDescriptionOpen = openDescriptionId === item.id;
  const showFocusSpent = item.status === "COMPLETED" && typeof item.focusSpentSeconds === "number" && item.focusSpentSeconds > 0;
  const timeMeta = [
    item.plannedTime ? formatTime(item.plannedTime) : null,
    item.deadlineTime ? `дедлайн ${formatTime(item.deadlineTime)}` : null
  ].filter(Boolean).join(" · ");

  return (
    <article className={`line-item plan-item status-${item.status.toLowerCase()}`}>
      <StatusCycleButton
        status={item.status}
        disabled={!canChangeStatus || busyItemId === item.id}
        onActivate={() => onCycle(item)}
        aria-label={`${dailyPlanCycleLabel(item.status)}: ${item.title}`}
      />

      {item.description ? (
        <button
          type="button"
          className={`description-toggle ${isDescriptionOpen ? "open" : ""}`}
          onClick={() => onToggleDescription(item.id)}
          aria-expanded={isDescriptionOpen}
          aria-label={isDescriptionOpen ? "Скрыть описание" : "Показать описание"}
        >
          ›
        </button>
      ) : <span className="description-spacer" />}

      <div className="todo-main">
        <div className="item-title-line">
          {isEditing ? (
            <TextInput
              className="inline-edit-input"
              autoFocus
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              onBlur={() => onSaveTitle(item)}
              onKeyDown={(event) => onTitleKey(event, item)}
            />
          ) : (
            <strong
              className={`editable-title ${canEditTitle ? "" : "is-readonly"}`}
              onClick={canEditTitle ? () => onBeginEdit(item) : undefined}
            >
              {item.title}
            </strong>
          )}
        </div>
        {isDescriptionOpen && item.description ? <p className="item-description">{item.description}</p> : null}
      </div>

      {timeMeta || showFocusSpent ? (
        <div className="plan-item-meta" aria-label="Время задачи">
          {timeMeta ? <span className="plan-item-clock-meta">{timeMeta}</span> : null}
          {showFocusSpent ? (
            <span className="plan-item-focus-time" title="Засчитанное Focus-время">
              {formatFocusClockDuration(item.focusSpentSeconds ?? 0)}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
