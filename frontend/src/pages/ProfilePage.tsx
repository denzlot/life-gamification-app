import { useEffect, useState } from "react";
import { api } from "../api/http";
import type { AchievementResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { GameHud } from "../components/GameHud";
import { ErrorLine, Loader } from "../components/Loader";
import { useAchievementWatcher } from "../context/AchievementContext";
import { useGame } from "../context/GameContext";
import { formatDateTime } from "../utils/format";

export function ProfilePage() {
  const { profile, loading, refreshProfile } = useGame();
  const { syncAchievements } = useAchievementWatcher();
  const [achievements, setAchievements] = useState<AchievementResponse[]>([]);
  const [achLoading, setAchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAchievements() {
    setAchLoading(true);
    setError(null);
    try {
      setAchievements(await api.profile.achievements());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить достижения");
    } finally {
      setAchLoading(false);
    }
  }

  useEffect(() => {
    loadAchievements();
  }, []);

  async function refreshAll() {
    await refreshProfile();
    const list = await syncAchievements(true);
    setAchievements(list);
  }

  return (
    <section className="page profile-page">
      <header className="page-header split-header compact-header">
        <div>
          <p className="eyebrow">профиль</p>
          <h1>{profile?.username ?? "Игрок"}</h1>
          <p className="muted">Роль: {profile?.role ?? "—"}</p>
        </div>
        <Button variant="ghost" onClick={refreshAll}>Обновить</Button>
      </header>

      {loading ? <Loader label="Загружаем профиль" /> : null}
      <ErrorLine error={error} />

      <section className="section-line profile-stats-line">
        <div>
          <p className="eyebrow">характеристики</p>
          <h2>Текущий прогресс</h2>
          <p className="muted">Аватар находится только на Today, чтобы не дублироваться на каждой странице.</p>
        </div>
        <GameHud stats={profile?.gameStats} />
      </section>

      <section className="section-line">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">открыто</p>
            <h2>Достижения</h2>
          </div>
          <span className="metric">{achievements.length}</span>
        </div>
        {achLoading ? <Loader /> : null}
        {!achLoading && achievements.length === 0 ? <EmptyState title="Достижений пока нет" text="Игровой цикл откроет первые достижения." /> : null}
        <div className="achievement-grid">
          {achievements.map((achievement) => (
            <article className="achievement-row" key={achievement.key}>
              <div className="achievement-icon">{achievement.category.slice(0, 2)}</div>
              <div>
                <strong>{achievement.title}</strong>
                <p className="muted">{achievement.description}</p>
                <small>{achievement.category} · +{achievement.xpReward} XP · {formatDateTime(achievement.unlockedAt)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
