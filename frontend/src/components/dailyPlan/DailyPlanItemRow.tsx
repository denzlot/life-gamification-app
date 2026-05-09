import type { KeyboardEvent } from "react";
import type { DailyPlanItemResponse } from "../../api/types";
import { formatTime, itemStatusLabel, sourceLabel } from "../../utils/format";
import { dailyPlanCycleLabel } from "../../utils/dailyPlanItems";
import { TextInput } from "../FormFields";
import { StatusCycleIcon } from "../StatusCycleIcon";

interface DailyPlanItemRowProps {
  item: DailyPlanItemResponse;
  busyItemId: number | null;
  editingId: number | null;
  editTitle: string;
  openDescriptionId: number | null;
  canChangeStatus: boolean;
  canEditTitle?: boolean;
  focused?: boolean;
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
  focused = false,
  setEditTitle,
  onCycle,
  onToggleDescription,
  onBeginEdit,
  onSaveTitle,
  onTitleKey
}: DailyPlanItemRowProps) {
  const isEditing = editingId === item.id;
  const isDescriptionOpen = openDescriptionId === item.id;

  return (
    <article
      className={`line-item plan-item status-${item.status.toLowerCase()} ${focused ? "focus-pulse" : ""}`}
      data-focus-item-id={item.id}
    >
      <button
        type="button"
        className={`status-cycle status-cycle-${item.status.toLowerCase()}`}
        disabled={!canChangeStatus || busyItemId === item.id}
        onClick={() => onCycle(item)}
        aria-label={`${dailyPlanCycleLabel(item.status)}: ${item.title}`}
      >
        <StatusCycleIcon status={item.status} />
      </button>

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
          <span className="item-type-badge">{sourceLabel(item.sourceType).toLowerCase()}</span>
        </div>
        <p className="muted compact-meta">
          {itemStatusLabel(item.status)}{item.plannedTime ? ` · ${formatTime(item.plannedTime)}` : ""}{item.deadlineTime ? ` · дедлайн ${formatTime(item.deadlineTime)}` : ""}
        </p>
        {isDescriptionOpen && item.description ? <p className="item-description">{item.description}</p> : null}
      </div>
    </article>
  );
}
