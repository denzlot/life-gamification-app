import { api } from "../api/http";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../utils/format";

export function StatsPage() {
  const { data, loading, error } = useAsync(() => api.stats.get(), []);

  if (loading) return <Loader label="Загружаем статистику" />;
  if (error) return <ErrorLine error={error} />;
  if (!data) return null;

  const maxWeekXp = Math.max(1, ...data.xpByWeek.map((item) => item.xp));
  const maxStreak = Math.max(1, ...data.streakHistory.map((item) => item.maxStreak));

  return (
    <section className="page">
      <header className="page-header compact-header">
        <p className="eyebrow">личные рекорды</p>
        <h1>Статистика</h1>
        <p className="muted">Без лидерборда: только твой XP, стрики и активность.</p>
      </header>

      <div className="stats-grid section-line">
        <Stat label="Лучший стрик" value={data.allTime.bestStreak} />
        <Stat label="Всего XP" value={data.allTime.totalXp} />
        <Stat label="Задачи" value={data.allTime.totalTasksCompleted} />
        <Stat label="Привычки" value={data.allTime.totalHabitsCompleted} />
        <Stat label="Квесты" value={data.allTime.totalQuestsCompleted} />
        <Stat label="Лучшая неделя" value={data.allTime.bestWeekXp} suffix={`XP · ${formatDate(data.allTime.bestWeekStartDate)}`} />
      </div>

      <section className="section-line">
        <p className="eyebrow">эта неделя</p>
        <div className="stats-grid compact-stats">
          <Stat label="XP" value={data.thisWeek.xp} />
          <Stat label="Задачи" value={data.thisWeek.tasksCompleted} />
          <Stat label="Привычки" value={data.thisWeek.habitsCompleted} />
          <Stat label="Активные дни" value={data.thisWeek.activeDays} />
        </div>
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
                <b>{week.xp}</b>
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

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
      {suffix ? <small>{suffix}</small> : null}
    </div>
  );
}
