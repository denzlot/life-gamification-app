import { useEffect, useState } from "react";
import { api } from "../api/http";
import type { AchievementResponse } from "../api/types";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { CharacterChooser } from "../components/CharacterChooser";
import { RevealSection } from "../components/RevealSection";
import { EmptyState } from "../components/EmptyState";
import { GameHud } from "../components/GameHud";
import { ErrorLine, Loader } from "../components/Loader";
import { useGame } from "../context/GameContext";
import { applyTheme, getCharacter, readSelectedCharacter, readTheme, type CharacterId } from "../utils/character";
import { formatDateTime } from "../utils/format";

export function ProfilePage() {
  const { profile, loading } = useGame();
  const [achievements, setAchievements] = useState<AchievementResponse[]>([]);
  const [achLoading, setAchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChooser, setShowChooser] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => readSelectedCharacter());
  const [previewCharacterId, setPreviewCharacterId] = useState<typeof selectedCharacterId>(null);
  const character = getCharacter(previewCharacterId ?? selectedCharacterId);

  function toggleChooser() {
    setShowChooser((value) => {
      const next = !value;
      if (!next) {
        setPreviewCharacterId(null);
        applyTheme(readTheme());
      }
      return next;
    });
  }

  function confirmCharacter(id: CharacterId) {
    setSelectedCharacterId(id);
    setPreviewCharacterId(null);
    setShowChooser(false);
  }

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

  useEffect(() => {
    return () => {
      applyTheme(readTheme());
    };
  }, []);

  return (
    <section className="page profile-page centered-page">
      <header className="page-header centered-title-header profile-title-header">
        <p className="eyebrow">профиль</p>
        <h1>Персонаж и прогресс</h1>
      </header>

      {loading ? <Loader label="Загружаем профиль" /> : null}
      <ErrorLine error={error} />

      <section className="section-line clean-section profile-character-card">
        <div className="profile-character-body">
          <div className="profile-avatar-slot">
            <Avatar stats={profile?.gameStats} compact characterId={character.id} />
          </div>
          <div className="profile-stats-slot">
            <div className="profile-character-head">
              <div>
                <p className="eyebrow">персонаж</p>
                <span className="profile-username-chip">{profile?.username ?? "Игрок"}</span>
                <h2>{character.name}</h2>
                <p className="muted">{character.description}</p>
              </div>
              <Button variant="ghost" onClick={toggleChooser}>{showChooser ? "Скрыть" : "Сменить"}</Button>
            </div>
            <GameHud stats={profile?.gameStats} />
          </div>
        </div>

        <RevealSection open={showChooser} className="option-reveal--wide profile-embed-chooser">
          <CharacterChooser
            embedded
            title="Выбери другого персонажа"
            description="Нажми на героя, чтобы сразу увидеть его тему. Подтверди выбор, когда всё подходит."
            initialCharacter={character.id}
            onPreview={setPreviewCharacterId}
            onConfirm={confirmCharacter}
          />
        </RevealSection>
      </section>

      <section className="section-line clean-section profile-achievements-panel">
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
                <small>{achievement.category} · <span className="xp-token">+{achievement.xpReward} XP</span> · {formatDateTime(achievement.unlockedAt)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
