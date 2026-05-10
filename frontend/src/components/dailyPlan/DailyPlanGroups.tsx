import type { KeyboardEvent } from "react";
import type { DailyPlanItemResponse, SourceType } from "../../api/types";
import { DailyPlanItemRow } from "./DailyPlanItemRow";

export interface DailyPlanGroup {
  source: SourceType;
  title: string;
  items: DailyPlanItemResponse[];
}

interface DailyPlanGroupsProps {
  groups: DailyPlanGroup[];
  twoColumnLayout: boolean;
  canChangeStatus: boolean;
  canEditTitle?: boolean;
  busyItemId: number | null;
  editingId: number | null;
  editTitle: string;
  openDescriptionId: number | null;
  className?: string;
  focusedItemId?: number | null;
  setEditTitle: (value: string) => void;
  onCycle: (item: DailyPlanItemResponse) => void;
  onToggleDescription: (id: number) => void;
  onBeginEdit: (item: DailyPlanItemResponse) => void;
  onSaveTitle: (item: DailyPlanItemResponse) => void;
  onTitleKey: (event: KeyboardEvent<HTMLInputElement>, item: DailyPlanItemResponse) => void;
}

function splitForColumns(items: DailyPlanItemResponse[], enabled: boolean) {
  if (!enabled) return [items];
  const splitAt = Math.ceil(items.length / 2);
  return [items.slice(0, splitAt), items.slice(splitAt)].filter((columnItems) => columnItems.length > 0);
}

/** Groups daily-plan rows by source while preserving the old list markup and CSS hooks. */
export function DailyPlanGroups({
  groups,
  twoColumnLayout,
  canChangeStatus,
  canEditTitle = canChangeStatus,
  busyItemId,
  editingId,
  editTitle,
  openDescriptionId,
  className = "",
  focusedItemId = null,
  setEditTitle,
  onCycle,
  onToggleDescription,
  onBeginEdit,
  onSaveTitle,
  onTitleKey
}: DailyPlanGroupsProps) {
  const classes = ["grouped-plan-list", twoColumnLayout ? "two-column-enabled" : "", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {groups.map((group) => (
        <section className={`plan-source-group group-${group.source.toLowerCase()}`} key={group.source}>
          <div className="plan-source-head">
            <h3>{group.title}</h3>
            <span>{group.items.length}</span>
          </div>
          <div className={`plan-source-body ${twoColumnLayout ? "two-plan-columns" : ""}`}>
            {splitForColumns(group.items, twoColumnLayout).map((columnItems, columnIndex) => (
              <div className="line-list todo-list typed-list clean-list plan-column-list" key={`${group.source}-${columnIndex}`}>
                {columnItems.map((item) => (
                  <DailyPlanItemRow
                    key={item.id}
                    item={item}
                    busyItemId={busyItemId}
                    editingId={editingId}
                    editTitle={editTitle}
                    openDescriptionId={openDescriptionId}
                    canChangeStatus={canChangeStatus}
                    canEditTitle={canEditTitle}
                    focused={focusedItemId === item.id}
                    setEditTitle={setEditTitle}
                    onCycle={onCycle}
                    onToggleDescription={onToggleDescription}
                    onBeginEdit={onBeginEdit}
                    onSaveTitle={onSaveTitle}
                    onTitleKey={onTitleKey}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
