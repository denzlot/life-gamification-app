import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import type { AchievementResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { formatDateTime } from "../utils/format";

const categoryLabels: Record<string, string> = {
  ALL: "Все",
  START: "Начало",
  TASKS: "Задачи",
  HABITS: "Привычки",
  QUESTS: "Квесты",
  FOCUS: "Focus",
  STREAK: "Стрик",
  DAYS: "Дни",
  LEVEL: "Уровни",
  SPECIAL: "Особые"
};

function categoryIcon(category: string) {
  if (category === "START") return "I";
  if (category === "STREAK") return "S";
  if (category === "LEVEL") return "L";
  if (category === "TASKS") return "T";
  if (category === "HABITS") return "H";
  if (category === "QUESTS") return "Q";
  if (category === "FOCUS") return "F";
  if (category === "DAYS") return "D";
  return "*";
}

function progressText(achievement: AchievementResponse) {
  if (achievement.unlocked) return "готово";
  return `${achievement.progress}/${achievement.requiredValue}`;
}

export function AchievementsPage() {
  const { syncAchievements } = useAchievementWatcher();
  const [catalog, setCatalog] = useState<AchievementResponse[]>([]);
  const [category, setCategory] = useState("ALL");
  const [showLocked, setShowLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAchievements() {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await api.profile.achievements());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить достижения");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAchievements();
  }, []);

  async function refreshAchievements() {
    setRefreshing(true);
    setError(null);
    try {
      setCatalog(await syncAchievements(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить достижения");
    } finally {
      setRefreshing(false);
    }
  }

  const cards = useMemo(() => catalog
    .filter((item) => category === "ALL" || item.category === category)
    .filter((item) => showLocked || item.unlocked), [catalog, category, showLocked]);

  const unlockedCount = catalog.filter((item) => item.unlocked).length;
  const lockedCount = Math.max(0, catalog.length - unlockedCount);
  const earnedXp = catalog
    .filter((item) => item.unlocked)
    .reduce((sum, item) => sum + item.xpReward, 0);
  const progress = catalog.length ? Math.round((unlockedCount / catalog.length) * 100) : 0;
  const categories = ["ALL", ...Array.from(new Set(catalog.map((item) => item.category)))];

  return (
    <section className="page achievements-page centered-page">
      <header className="page-header split-header compact-header achievements-hero">
        <div>
          <p className="eyebrow">коллекция</p>
          <h1>Достижения</h1>
          <p className="muted">Открытые награды, ближайшие цели и понятный прогресс без скрытой витрины.</p>
        </div>
        <Button variant="ghost" onClick={refreshAchievements} disabled={refreshing}>{refreshing ? "Проверяем" : "Обновить"}</Button>
      </header>

      <section className="section-line achievement-progress-panel clean-section">
        <div>
          <p className="eyebrow">прогресс</p>
          <h2>{unlockedCount}/{catalog.length} открыто</h2>
        </div>
        <div className="achievement-progress-meter" aria-label={`Открыто ${progress}% достижений`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{progress}%</strong>
      </section>

      <section className="achievement-overview" aria-label="Сводка достижений">
        <div>
          <span>Открыто</span>
          <strong>{unlockedCount}</strong>
        </div>
        <div>
          <span>В работе</span>
          <strong>{lockedCount}</strong>
        </div>
        <div>
          <span>Получено XP</span>
          <strong>{earnedXp}</strong>
        </div>
      </section>

      <section className="section-line clean-section achievements-filter-panel">
        <div className="filter-row achievement-filter-row">
          {categories.map((entry) => (
            <button type="button" key={entry} className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>
              {categoryLabels[entry] ?? entry}
            </button>
          ))}
        </div>
        <div className="achievement-toggle-row">
          <button type="button" className={showLocked ? "active" : ""} onClick={() => setShowLocked((value) => !value)}>
            {showLocked ? "Показывать закрытые" : "Только открытые"}
          </button>
        </div>
      </section>

      {loading ? <Loader label="Загружаем достижения" /> : null}
      <ErrorLine error={error} />
      {!loading && cards.length === 0 ? <EmptyState title="Ничего не найдено" text="Смени фильтр или включи закрытые достижения." /> : null}

      <div className="achievement-catalog-grid">
        {cards.map((achievement) => {
          const required = Math.max(achievement.requiredValue, 1);
          const itemProgress = Math.min(100, Math.round((achievement.progress / required) * 100));
          const categoryLabel = categoryLabels[achievement.category] ?? achievement.category;

          return (
            <article className={`achievement-card ${achievement.unlocked ? "unlocked" : "locked"}`} key={achievement.key}>
              <div className="achievement-card-icon">{categoryIcon(achievement.category)}</div>
              <div className="achievement-card-body">
                <div className="achievement-card-title">
                  <div>
                    <span className="achievement-category-label">{categoryLabel}</span>
                    <strong>{achievement.title}</strong>
                  </div>
                  <span className={`achievement-state-chip ${achievement.unlocked ? "is-open" : ""}`}>
                    {achievement.unlocked ? "открыто" : "закрыто"}
                  </span>
                </div>
                <p>{achievement.description}</p>
                <div className="achievement-card-meta">
                  <span>{progressText(achievement)}</span>
                  <span className="xp-token">+{achievement.xpReward} XP</span>
                </div>
                <div className="achievement-mini-meter" aria-hidden="true"><span style={{ width: `${itemProgress}%` }} /></div>
                {achievement.unlocked && achievement.unlockedAt
                  ? <small>Открыто: {formatDateTime(achievement.unlockedAt)}</small>
                  : <small>{achievement.progress > 0 ? "Уже начато, осталось дожать." : "Пока не начато."}</small>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
