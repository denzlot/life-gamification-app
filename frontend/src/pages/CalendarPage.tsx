import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import type { CalendarDayResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { formatDate, monthLabel, planStatusLabel, signed, todayISO } from "../utils/format";

const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function addMonths(date: Date, diff: number) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [days, setDays] = useState<CalendarDayResponse[]>([]);
  const [selected, setSelected] = useState<CalendarDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.calendar
      .month(cursor.getFullYear(), cursor.getMonth() + 1)
      .then((result) => {
        setDays(result);
        setSelected((current) => current ?? result.find((day) => day.date === todayISO()) ?? result.find((day) => day.status !== "EMPTY") ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить календарь"))
      .finally(() => setLoading(false));
  }, [cursor]);

  const cells = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.date, day]));
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: total }, (_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) return null;
      const fixedIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
      return byDate.get(fixedIso) ?? {
        date: fixedIso,
        status: "EMPTY" as const,
        completedCount: 0,
        totalCount: 0,
        xpEarned: 0,
        hpDelta: 0,
        streakDay: 0,
        shieldUsed: false
      };
    });
  }, [cursor, days]);

  return (
    <section className="page calendar-page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">история дней</p>
          <h1>Календарь</h1>
          <p className="muted">Дни компактные и кликабельные. Закрытый день можно открыть отдельно.</p>
        </div>
        <div className="header-actions">
          <Button variant="ghost" onClick={() => setCursor(addMonths(cursor, -1))}>Назад</Button>
          <Button variant="ghost" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Текущий</Button>
          <Button variant="ghost" onClick={() => setCursor(addMonths(cursor, 1))}>Вперёд</Button>
        </div>
      </header>

      <div className="calendar-layout">
        <section className="section-line calendar-panel">
          <div className="section-title-row small-title-row">
            <h2>{monthLabel(cursor)}</h2>
            <span className="muted">{days.filter((day) => day.status !== "EMPTY").length} дней с планом</span>
          </div>
          {loading ? <Loader /> : <ErrorLine error={error} />}
          {!loading && days.length === 0 ? <EmptyState title="Данных календаря пока нет" /> : null}
          <div className="calendar-grid compact-calendar">
            {weekdays.map((name) => <div className="weekday" key={name}>{name}</div>)}
            {cells.map((day, index) => day ? (
              <button
                type="button"
                className={`calendar-cell status-${String(day.status).toLowerCase()} ${selected?.date === day.date ? "selected" : ""}`}
                key={day.date}
                onClick={() => setSelected(day)}
              >
                <span className="calendar-top"><strong>{Number(day.date.slice(8, 10))}</strong>{day.shieldUsed ? <small>щит</small> : null}</span>
                <span className="calendar-line">{day.completedCount}/{day.totalCount}</span>
                {day.status !== "EMPTY" ? <span className="calendar-line muted">XP {day.xpEarned}</span> : null}
              </button>
            ) : <div className="calendar-cell empty-cell" key={`empty-${index}`} />)}
          </div>
        </section>

        <aside className="section-line day-preview">
          <DayPreview day={selected} />
        </aside>
      </div>
    </section>
  );
}

function DayPreview({ day }: { day: CalendarDayResponse | null }) {
  if (!day) return <EmptyState title="День не выбран" text="Нажми на дату в календаре." />;
  return (
    <div className="day-details-inner">
      <p className="eyebrow">{formatDate(day.date)}</p>
      <h2>{planStatusLabel(day.status)}</h2>
      <div className="summary-strip day-summary">
        <span>готово {day.completedCount}/{day.totalCount}</span>
        <span>XP {day.xpEarned}</span>
        <span>HP {signed(day.hpDelta)}</span>
        <span>стрик {day.streakDay}</span>
      </div>
      <p className="muted">Открой день, чтобы посмотреть выполненные, проваленные и доступные из истории действия.</p>
      <Link className="btn btn-primary text-button-link" to={`/calendar/${day.date}`}>Открыть день</Link>
    </div>
  );
}
