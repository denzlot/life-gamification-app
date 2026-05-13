import { api } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../utils/format";
import { formatFocusTimerDuration } from "../utils/focusTimerStorage";

export function StatsPage() {
  const { data, loading, error } = useAsync(() => api.stats.get(), []);

  if (loading) return <Loader label="Загружаем статистику" />;
  if (error) return <ErrorLine error={error} />;
  if (!data) return null;

  const maxWeekXp = Math.max(1, ...data.xpByWeek.map((item) => item.xp));
  const maxStreak = Math.max(1, ...data.streakHistory.map((item) => item.maxStreak));
  const focus = data.focus;
  const focusTypeRows = [
    { key: "task", label: "Задачи", value: focus.taskSeconds },
    { key: "habit", label: "Привычки", value: focus.habitSeconds },
    { key: "quest", label: "Квесты", value: focus.questSeconds }
  ];
  const focusTimelineRows = [
    { key: "planned", label: "План", value: focus.plannedSeconds },
    { key: "actual", label: "Факт", value: focus.actualSeconds },
    { key: "credited", label: "Зачтено", value: focus.totalSeconds }
  ];
  const hasFocusData = focusTimelineRows.some((row) => row.value > 0) || focus.overtimeSeconds > 0;
  const maxFocusTypeSeconds = Math.max(1, ...focusTypeRows.map((row) => row.value));
  const maxFocusTimelineSeconds = Math.max(1, ...focusTimelineRows.map((row) => row.value));
  const bestFocusType = focusTypeRows.reduce((best, row) => row.value > best.value ? row : best, focusTypeRows[0]);
  const creditedVsPlanned = focus.totalSeconds - focus.plannedSeconds;
  const actualVsPlanned = focus.actualSeconds - focus.plannedSeconds;

  return (
    <section className="page">
      <header className="page-header compact-header">
        <p className="eyebrow">личные рекорды</p>
        <h1>Статистика</h1>
        <p className="muted">Без лидерборда: только твой XP, стрики и активность.</p>
      </header>

      <div className="stats-grid section-line">
        <Stat label="Лучший стрик" value={data.allTime.bestStreak} />
        <Stat label="Всего XP" value={data.allTime.totalXp} tone="xp" />
        <Stat label="Задачи" value={data.allTime.totalTasksCompleted} />
        <Stat label="Привычки" value={data.allTime.totalHabitsCompleted} />
        <Stat label="Квесты" value={data.allTime.totalQuestsCompleted} />
        <Stat label="Лучшая неделя" value={data.allTime.bestWeekXp} suffix={`XP · ${formatDate(data.allTime.bestWeekStartDate)}`} tone="xp" />
      </div>

      <section className="section-line">
        <p className="eyebrow">эта неделя</p>
        <div className="stats-grid compact-stats">
          <Stat label="XP" value={data.thisWeek.xp} tone="xp" />
          <Stat label="Задачи" value={data.thisWeek.tasksCompleted} />
          <Stat label="Привычки" value={data.thisWeek.habitsCompleted} />
          <Stat label="Активные дни" value={data.thisWeek.activeDays} />
        </div>
      </section>

      <section className="section-line stats-focus-panel">
        <div className="stats-section-heading">
          <div>
            <p className="eyebrow">focus time</p>
            <h2>Фокус</h2>
          </div>
          <span className="stats-subtle-pill">считается по зачтённому времени</span>
        </div>

        {!hasFocusData ? (
          <EmptyState title="Focus-сессий пока нет" text="Когда завершишь задачу через Focus, здесь появятся зачтённое время и разбивка по типам." />
        ) : (
          <>
            <div className="stats-grid compact-stats focus-summary-cards">
              <Stat label="Всего зачтено" value={formatFocusTimerDuration(focus.totalSeconds)} />
              <Stat label="Лучший тип" value={bestFocusType.value > 0 ? bestFocusType.label : "—"} suffix={bestFocusType.value > 0 ? formatFocusTimerDuration(bestFocusType.value) : undefined} />
              <Stat label="План → зачёт" value={formatFocusDelta(creditedVsPlanned)} />
              <Stat label="Сверх плана" value={formatFocusTimerDuration(focus.overtimeSeconds)} />
            </div>

            <div className="focus-analytics-grid">
              <div className="focus-analytics-card">
                <div className="focus-card-heading">
                  <strong>Разбивка по типам</strong>
                  <span>{formatFocusTimerDuration(focus.totalSeconds)}</span>
                </div>
                <div className="focus-mini-bars">
                  {focusTypeRows.map((row) => (
                    <FocusBar
                      key={row.key}
                      label={row.label}
                      value={row.value}
                      max={maxFocusTypeSeconds}
                    />
                  ))}
                </div>
              </div>

              <div className="focus-analytics-card">
                <div className="focus-card-heading">
                  <strong>План / факт / зачёт</strong>
                  <span>{formatFocusDelta(actualVsPlanned)} к плану</span>
                </div>
                <div className="focus-mini-bars">
                  {focusTimelineRows.map((row) => (
                    <FocusBar
                      key={row.key}
                      label={row.label}
                      value={row.value}
                      max={maxFocusTimelineSeconds}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="two-col">
        <section className="section-line">
          <p className="eyebrow">XP по неделям</p>
          {data.xpByWeek.length === 0 ? <EmptyState title="Истории XP пока нет" /> : null}
          <div className="bar-list">
            {data.xpByWeek.map((week) => (
              <div className="bar-row" key={week.weekStart}>
                <span>{formatDate(week.weekStart)}</span>
                <div className="bar-track"><span style={{ width: `${Math.round((week.xp / maxWeekXp) * 100)}%` }} /></div>
                <b className="xp-token">{week.xp}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="section-line">
          <p className="eyebrow">история стрика</p>
          {data.streakHistory.length === 0 ? <EmptyState title="Истории стрика пока нет" /> : null}
          <div className="bar-list">
            {data.streakHistory.map((item) => (
              <div className="bar-row" key={item.month}>
                <span>{item.month}</span>
                <div className="bar-track"><span style={{ width: `${Math.round((item.maxStreak / maxStreak) * 100)}%` }} /></div>
                <b>{item.maxStreak}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string | number; suffix?: string; tone?: "xp" | "hp" }) {
  return (
    <div className={`stat-line ${tone ? `stat-${tone}` : ""}`}>
      <span>{label}</span>
      <strong className={tone === "xp" ? "xp-token" : tone === "hp" ? "hp-token" : undefined}>{value}</strong>
      {suffix ? <small>{suffix}</small> : null}
    </div>
  );
}

function FocusBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = value > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;

  return (
    <div className="focus-bar-row">
      <span>{label}</span>
      <div className="focus-bar-track" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
      <b>{formatFocusTimerDuration(value)}</b>
    </div>
  );
}

function formatFocusDelta(seconds: number) {
  if (seconds === 0) return "0 сек";
  const sign = seconds > 0 ? "+" : "−";
  return `${sign}${formatFocusTimerDuration(Math.abs(seconds))}`;
}
