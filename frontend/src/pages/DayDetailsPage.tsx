import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/http";
import type { CalendarDayResponse, DailyPlanResponse, HistoryItemResponse } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { actionLabel, formatDate, formatDateTime, itemStatusLabel, planStatusLabel, signed, sourceLabel, todayISO } from "../utils/format";

export function DayDetailsPage() {
  const { date = todayISO() } = useParams();
  const [summary, setSummary] = useState<CalendarDayResponse | null>(null);
  const [todayPlan, setTodayPlan] = useState<DailyPlanResponse | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const [year, month] = date.split("-").map(Number);
    setLoading(true);
    setError(null);
    Promise.all([
      api.calendar.month(year, month),
      api.history.get(0, 100),
      date === todayISO()
        ? api.dailyPlans.today().catch((err) => {
            if (err instanceof ApiError && err.status === 404) return null;
            throw err;
          })
        : Promise.resolve(null)
    ])
      .then(([calendar, history, plan]) => {
        setSummary(calendar.find((day) => day.date === date) ?? null);
        setHistoryItems(history.items.filter((item) => item.planDate === date));
        setTodayPlan(plan);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось открыть день"))
      .finally(() => setLoading(false));
  }, [date]);

  const planItems = todayPlan?.items ?? [];
  const actionItems = historyItems.filter((item) => item.action !== "DAY_CLOSED");
  const missingCount = useMemo(() => {
    const total = summary?.totalCount ?? 0;
    const visible = Math.max(planItems.length, actionItems.length);
    return Math.max(0, total - visible);
  }, [actionItems.length, planItems.length, summary?.totalCount]);

  return (
    <section className="page narrow-page">
      <header className="page-header compact-header">
        <p className="eyebrow">день</p>
        <h1>{formatDate(date)}</h1>
        <p className="muted"><Link className="text-link" to="/calendar">Вернуться в календарь</Link></p>
      </header>

      {loading ? <Loader label="Открываем день" /> : <ErrorLine error={error} />}

      {summary ? (
        <section className="section-line">
          <h2>{planStatusLabel(summary.status)}</h2>
          <div className="summary-strip day-summary">
            <span>готово {summary.completedCount}/{summary.totalCount}</span>
            <span>XP {summary.xpEarned}</span>
            <span>HP {signed(summary.hpDelta)}</span>
            <span>стрик {summary.streakDay}</span>
            <span>щит {summary.shieldUsed ? "сработал" : "нет"}</span>
          </div>
        </section>
      ) : null}

      <section className="section-line">
        <p className="eyebrow">пункты дня</p>
        {planItems.length > 0 ? (
          <div className="line-list details-list">
            {planItems.map((item) => (
              <article className={`line-item plan-item status-${item.status.toLowerCase()}`} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p className="muted">{sourceLabel(item.sourceType)} · {itemStatusLabel(item.status)} · XP {item.xpReward}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {planItems.length === 0 && actionItems.length > 0 ? (
          <div className="line-list details-list">
            {actionItems.map((item) => (
              <article className={`line-item action-${String(item.action).toLowerCase()}`} key={item.id}>
                <div>
                  <strong>{item.title || actionLabel(item.action)}</strong>
                  <p className="muted">{sourceLabel(item.sourceType)} · {actionLabel(item.action)} · XP {signed(item.xpDelta)} · HP {signed(item.hpDelta)}</p>
                </div>
                <span className="muted">{formatDateTime(item.createdAt)}</span>
              </article>
            ))}
          </div>
        ) : null}

        {missingCount > 0 ? (
          <p className="muted missing-note">В истории backend-а нет названий для {missingCount} невыполненных пунктов этого дня. Итог виден в календаре, а полный список появится после endpoint-а плана по дате.</p>
        ) : null}

        {!loading && planItems.length === 0 && actionItems.length === 0 ? (
          <EmptyState title="Подробностей нет" text="Для этого дня нет записей ActivityLog или план не открывался." />
        ) : null}
      </section>
    </section>
  );
}
