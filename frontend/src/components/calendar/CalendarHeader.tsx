import { monthLabel } from "../../utils/format";
import { addMonths } from "../../utils/calendarSchedule";

interface CalendarHeaderProps {
  cursor: Date;
  onCursorChange: (cursor: Date) => void;
}

export function CalendarHeader({ cursor, onCursorChange }: CalendarHeaderProps) {
  function jumpToCurrentMonth() {
    onCursorChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  }

  return (
    <header className="page-header centered-title-header calendar-title-header">
      <p className="eyebrow">календарь</p>
      <div className="date-inline-switcher calendar-inline-switcher" aria-label="Переключение месяцев">
        <button type="button" className="nav-text-button" onClick={() => onCursorChange(addMonths(cursor, -1))} aria-label="Предыдущий месяц">← предыдущий</button>
        <h1>{monthLabel(cursor)}</h1>
        <button type="button" className="nav-text-button" onClick={() => onCursorChange(addMonths(cursor, 1))} aria-label="Следующий месяц">следующий →</button>
      </div>
      <div className="calendar-header-actions">
        <button type="button" className="center-jump-button" onClick={jumpToCurrentMonth}>текущий месяц</button>
      </div>
    </header>
  );
}
