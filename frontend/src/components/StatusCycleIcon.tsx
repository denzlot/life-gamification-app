import type { DailyPlanItemStatus } from "../api/types";

export function StatusCycleIcon({ status }: { status: DailyPlanItemStatus }) {
  return (
    <svg className="status-cycle-svg" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle className="status-cycle-ring" cx="10" cy="10" r="8.2" />
      {status === "COMPLETED" ? <path className="status-cycle-mark" d="M5.8 10.2 8.6 13 14.3 7" /> : null}
      {status === "FAILED" ? <path className="status-cycle-mark" d="M5.8 10h8.4" /> : null}
    </svg>
  );
}
