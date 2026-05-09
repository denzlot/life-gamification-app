import type { KeyboardEvent } from "react";
import type { DailyPlanItemResponse } from "../../api/types";
import { DailyPlanGroups as SharedDailyPlanGroups, type DailyPlanGroup } from "../dailyPlan/DailyPlanGroups";

interface DayPlanGroupsProps {
  groups: DailyPlanGroup[];
  twoColumnLayout: boolean;
  canChangeStatus: boolean;
  busyItemId: number | null;
  editingId: number | null;
  editTitle: string;
  openDescriptionId: number | null;
  setEditTitle: (value: string) => void;
  onCycle: (item: DailyPlanItemResponse) => void;
  onToggleDescription: (id: number) => void;
  onBeginEdit: (item: DailyPlanItemResponse) => void;
  onSaveTitle: (item: DailyPlanItemResponse) => void;
  onTitleKey: (event: KeyboardEvent<HTMLInputElement>, item: DailyPlanItemResponse) => void;
}

/** Day details uses the shared daily-plan list, with an extra class for page-specific spacing. */
export function DayPlanGroups(props: DayPlanGroupsProps) {
  return <SharedDailyPlanGroups {...props} className="details-list" />;
}
