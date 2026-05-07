import { useEffect, useMemo, useState } from "react";
import { api } from "../api/http";
import type { AchievementResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { formatDateTime } from "../utils/format";

interface AchievementCatalogItem {
  key: string;
  title: string;
  description: string;
  category: string;
  requiredValue: number;
  xpReward: number;
}

const achievementCatalog: AchievementCatalogItem[] = [
  { key: "streak_7", title: "Неделя без пропусков", description: "7 дней подряд. Даёт XP, немного HP и щит стрика.", category: "STREAK", requiredValue: 7, xpReward: 70 },
  { key: "streak_30", title: "Месяц дисциплины", description: "30 дней подряд. Большая награда за стабильность.", category: "STREAK", requiredValue: 30, xpReward: 250 },
  { key: "streak_100", title: "Легенда стрика", description: "100 дней подряд. Полностью восстанавливает HP.", category: "STREAK", requiredValue: 100, xpReward: 1000 },
  { key: "level_5", title: "Набирает обороты", description: "Достигни уровня 5.", category: "LEVEL", requiredValue: 5, xpReward: 100 },
  { key: "level_10", title: "Ветеран", description: "Достигни уровня 10.", category: "LEVEL", requiredValue: 10, xpReward: 250 },
  { key: "level_20", title: "Мастер", description: "Достигни уровня 20.", category: "LEVEL", requiredValue: 20, xpReward: 500 },
  { key: "tasks_10", title: "Первые шаги", description: "Выполни 10 задач.", category: "TASKS", requiredValue: 10, xpReward: 25 },
  { key: "tasks_100", title: "Сотня", description: "Выполни 100 задач.", category: "TASKS", requiredValue: 100, xpReward: 150 },
  { key: "habits_50", title: "Привычка привилась", description: "Выполни привычки 50 раз.", category: "HABITS", requiredValue: 50, xpReward: 100 },
  { key: "quests_1", title: "Первый квест", description: "Заверши первый квест.", category: "QUESTS", requiredValue: 1, xpReward: 75 },
  { key: "shield_used", title: "Щит сработал", description: "Щит защитил стрик.", category: "SPECIAL", requiredValue: 1, xpReward: 50 },
  { key: "full_hp", title: "В идеальной форме", description: "Восстанови HP до максимума.", category: "SPECIAL", requiredValue: 100, xpReward: 30 }
];

const categoryLabels: Record<string, string> = {
  ALL: "Все",
  STREAK: "Стрик",
  LEVEL: "Уровни",
  TASKS: "Задачи",
  HABITS: "Привычки",
  QUESTS: "Квесты",
  SPECIAL: "Особые"
};

function categoryIcon(category: string) {
  if (category === "STREAK") return "🔥";
  if (category === "LEVEL") return "✦";
  if (category === "TASKS") return "✓";
  if (category === "HABITS") return "↻";
  if (category === "QUESTS") return "⌁";
  return "◆";
}

export function AchievementsPage() {
  const { syncAchievements } = useAchievementWatcher();
  const [unlocked, setUnlocked] = useState<AchievementResponse[]>([]);
  const [category, setCategory] = useState("ALL");
  const [showLocked, setShowLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAchievements() {
    setLoading(true);
    setError(null);
    try {
      setUnlocked(await api.profile.achievements());
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
      setUnlocked(await syncAchievements(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить достижения");
    } finally {
      setRefreshing(false);
    }
  }

  const unlockedByKey = useMemo(() => new Map(unlocked.map((item) => [item.key, item])), [unlocked]);
  const cards = useMemo(() => achievementCatalog
    .map((item) => ({ ...item, unlocked: unlockedByKey.get(item.key) ?? null }))
    .filter((item) => category === "ALL" || item.category === category)
    .filter((item) => showLocked || item.unlocked), [category, showLocked, unlockedByKey]);

  const unlockedCount = unlockedByKey.size;
  const progress = Math.round((unlockedCount / achievementCatalog.length) * 100);
  const categories = ["ALL", ...Array.from(new Set(achievementCatalog.map((item) => item.category)))];

  return (
    <section className="page achievements-page centered-page">
      <header className="page-header split-header compact-header achievements-hero">
        <div>
          <p className="eyebrow">коллекция</p>
          <h1>Все достижения</h1>
          <p className="muted">Открытые и ещё закрытые цели в одном месте.</p>
        </div>
        <Button variant="ghost" onClick={refreshAchievements} disabled={refreshing}>{refreshing ? "Обновляем" : "Проверить"}</Button>
      </header>

      <section className="section-line achievement-progress-panel clean-section">
        <div>
          <p className="eyebrow">прогресс</p>
          <h2>{unlockedCount}/{achievementCatalog.length} открыто</h2>
        </div>
        <div className="achievement-progress-meter" aria-label={`Открыто ${progress}% достижений`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{progress}%</strong>
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
          const unlockedAchievement = achievement.unlocked;
          return (
            <article className={`achievement-card ${unlockedAchievement ? "unlocked" : "locked"}`} key={achievement.key}>
              <div className="achievement-card-icon">{categoryIcon(achievement.category)}</div>
              <div className="achievement-card-body">
                <div className="achievement-card-title">
                  <strong>{achievement.title}</strong>
                  <span>{unlockedAchievement ? "открыто" : "закрыто"}</span>
                </div>
                <p>{achievement.description}</p>
                <div className="achievement-card-meta">
                  <span>{categoryLabels[achievement.category] ?? achievement.category}</span>
                  <span>цель: {achievement.requiredValue}</span>
                  <span className="xp-token">+{achievement.xpReward} XP</span>
                </div>
                {unlockedAchievement ? <small>Открыто: {formatDateTime(unlockedAchievement.unlockedAt)}</small> : <small>Продолжай выполнять планы, чтобы разблокировать.</small>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
