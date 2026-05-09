import { Link } from "react-router-dom";
import { addDays } from "../../utils/calendarSchedule";
import { planStatusLabel, todayISO } from "../../utils/format";
import type { CalendarDayResponse, DailyPlanResponse } from "../../api/types";

function monthDayLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(new Date(`${date}T12:00:00`));
}

interface DayDetailsHeroProps {
  date: string;
  plan: DailyPlanResponse | null;
  summary: CalendarDayResponse | null;
  onNavigateDate: (targetDate: string) => void;
}

export function DayDetailsHero({ date, plan, summary, onNavigateDate }: DayDetailsHeroProps) {
  const today = todayISO();
  const statusText = plan ? planStatusLabel(plan.status) : summary?.status === "EMPTY" ? "день не открыт" : planStatusLabel(summary?.status);

  return (
    <header className="day-hero">
      <p className="eyebrow">{weekdayLabel(date)}</p>
      <div className="date-inline-switcher day-date-inline" aria-label="Переключение дней">
        <button type="button" className="nav-text-button" onClick={() => onNavigateDate(addDays(date, -1))} aria-label="Предыдущий день">← предыдущий</button>
        <h1>{monthDayLabel(date)}</h1>
        <button type="button" className="nav-text-button" onClick={() => onNavigateDate(addDays(date, 1))} aria-label="Следующий день">следующий →</button>
      </div>
      <div className="day-status-row">
        <span>{statusText}</span>
        <Link className="day-calendar-link" to="/calendar">календарь</Link>
      </div>
      {date === today ? <span className="sr-only">Сегодняшний день открывается на странице Today.</span> : null}
    </header>
  );
}
