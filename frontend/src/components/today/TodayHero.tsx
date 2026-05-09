import { Link } from "react-router-dom";
import type { DailyPlanStatus } from "../../api/types";
import { planStatusLabel } from "../../utils/format";

function addDays(date: string, delta: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  return next.toISOString().slice(0, 10);
}

function monthDayLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(new Date(`${date}T12:00:00`));
}

export function TodayHero({ date, status }: { date: string; status?: DailyPlanStatus }) {
  return (
    <header className="day-hero today-hero">
      <p className="eyebrow">{weekdayLabel(date)}</p>
      <div className="date-inline-switcher day-date-inline" aria-label="Переключение дней">
        <Link className="nav-text-button" to={`/calendar/${addDays(date, -1)}`} aria-label="Предыдущий день">← предыдущий</Link>
        <h1>{monthDayLabel(date)}</h1>
        <Link className="nav-text-button" to={`/calendar/${addDays(date, 1)}`} aria-label="Следующий день">следующий →</Link>
      </div>
      <div className="day-status-row">
        <span>{status ? planStatusLabel(status) : "день не открыт"}</span>
      </div>
    </header>
  );
}
