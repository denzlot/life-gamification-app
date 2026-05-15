import { Link } from "react-router-dom";
import type { CalendarDayResponse } from "../../api/types";
import { planStatusLabel, signed } from "../../utils/format";
import { dayLink, questDayLabel, type PaceInfo, type QuestDayStats } from "../../utils/calendarSchedule";
import { dayQualityIcon, dayQualityLabel } from "../../utils/dayQuality";

function pastClosedStatus(day: CalendarDayResponse, today: string) {
  if (day.date >= today || day.status === "EMPTY") return "";
  if (day.status === "CLOSED") return "";
  return planStatusLabel(day.status).toLowerCase();
}

function PastDayQuality({ day }: { day: CalendarDayResponse }) {
  const quality = day.dayQuality ?? "EMPTY";
  const label = dayQualityLabel(quality);

  return (
    <span
      className={`day-quality-dot quality-${quality.toLowerCase()}`}
      role="img"
      title={`Качество дня: ${label}`}
      aria-label={`Качество дня: ${label}`}
    >
      {dayQualityIcon(quality)}
    </span>
  );
}

function CalendarWorkload({ day, today }: { day: CalendarDayResponse; today: string }) {
  const pending = Math.max(0, day.totalCount - day.completedCount);
  const closedDay = day.status === "CLOSED";
  const showCompletion = closedDay || day.date < today;

  if (!showCompletion) {
    const tone = day.date > today ? "future" : "planned";
    return (
      <span className="workload-mini-blocks" title={`Нагрузка: запланировано ${day.totalCount}`} aria-label={`Нагрузка: запланировано ${day.totalCount}`}>
        <span className="workload-row workload-count-row">
          <span className={`workload-chip total ${tone}`}><i className="workload-icon" aria-hidden="true">-</i>{day.totalCount}</span>
        </span>
      </span>
    );
  }

  return (
    <span className="workload-mini-blocks" title={`Нагрузка: выполнено ${day.completedCount}, не выполнено ${pending}`} aria-label={`Нагрузка: выполнено ${day.completedCount}, не выполнено ${pending}`}>
      <span className="workload-row workload-count-row">
        <span className="workload-chip done"><i aria-hidden="true">✓</i>{day.completedCount}</span>
        <span className="workload-chip pending"><i aria-hidden="true">×</i>{pending}</span>
      </span>
    </span>
  );
}

interface CalendarGridProps {
  cells: CalendarDayResponse[];
  weekdayHeader: string[];
  today: string;
  selectedQuestActive: boolean;
  stepStatsByDate: Record<string, QuestDayStats>;
  pace: PaceInfo;
  showWorkload: boolean;
  showRewards: boolean;
}

export function CalendarGrid({ cells, weekdayHeader, today, selectedQuestActive, stepStatsByDate, pace, showWorkload, showRewards }: CalendarGridProps) {
  return (
    <div className="calendar-grid compact-calendar pretty-calendar refined-calendar quest-calendar-grid smaller-calendar-grid">
      {weekdayHeader.map((name, index) => <div className="weekday" key={`${name}-${index}`}>{name}</div>)}
      {cells.map((day) => {
        const questStats = selectedQuestActive ? (stepStatsByDate[day.date] ?? { total: 0, completed: 0, skipped: 0, pending: 0 }) : { total: 0, completed: 0, skipped: 0, pending: 0 };
        const hasQuestSteps = selectedQuestActive && questStats.total > 0;
        const isNeedDay = selectedQuestActive && pace.needDate === day.date && pace.needCount > 0;
        const isPastDue = selectedQuestActive && day.date < today && questStats.pending > 0;
        const showPastQuality = !showWorkload && day.date < today && day.status === "CLOSED";

        return (
          <Link
            className={`calendar-cell status-${String(day.status).toLowerCase()} ${day.date === today ? "today" : ""} ${hasQuestSteps ? "has-quest-steps" : ""} ${isPastDue ? "quest-behind-day" : ""} ${isNeedDay ? `quest-need-day need-${pace.tone}` : ""}`}
            key={day.date}
            to={dayLink(day.date, today)}
          >
            <span className="calendar-top">
              <strong>{Number(day.date.slice(8, 10))}</strong>
              <small>{pastClosedStatus(day, today)}</small>
            </span>
            {showPastQuality ? <span className="calendar-line completed-day-line"><PastDayQuality day={day} /></span> : null}
            {hasQuestSteps ? <span className="quest-step-line">{questDayLabel(questStats.total, questStats.completed, day.date, today)}</span> : null}
            {isNeedDay ? <span className={`need-badge need-${pace.tone}`}>надо {pace.needCount}</span> : null}
            {showWorkload && day.totalCount > 0 ? <CalendarWorkload day={day} today={today} /> : null}
            {showRewards && (day.xpEarned || day.hpDelta) ? <span className="reward-line"><span className="xp-token">XP {signed(day.xpEarned)}</span><span className="hp-token">HP {signed(day.hpDelta)}</span></span> : null}
          </Link>
        );
      })}
    </div>
  );
}
