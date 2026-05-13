import { useEffect, useState } from "react";
import { api } from "../api/http";
import type { AchievementResponse, CreateTelegramLinkResponse, TelegramSettingsResponse } from "../api/types";
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
  const [telegram, setTelegram] = useState<TelegramSettingsResponse | null>(null);
  const [telegramLink, setTelegramLink] = useState<CreateTelegramLinkResponse | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
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

  async function loadTelegramSettings() {
    setTelegramError(null);
    try {
      setTelegram(await api.telegram.settings());
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : "Не удалось загрузить настройки Telegram");
    }
  }

  async function createTelegramLink() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      setTelegramLink(await api.telegram.createLinkCode());
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : "Не удалось создать link code");
    } finally {
      setTelegramBusy(false);
    }
  }

  async function updateTelegramSettings(next: TelegramSettingsResponse) {
    setTelegram(next);
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      setTelegram(await api.telegram.updateSettings({
        remindersEnabled: next.remindersEnabled,
        plannedRemindersEnabled: next.plannedRemindersEnabled,
        deadlineRemindersEnabled: next.deadlineRemindersEnabled
      }));
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : "Не удалось сохранить настройки Telegram");
      loadTelegramSettings().catch(() => undefined);
    } finally {
      setTelegramBusy(false);
    }
  }

  async function unlinkTelegram() {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      await api.telegram.unlink();
      setTelegramLink(null);
      await loadTelegramSettings();
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : "Не удалось отвязать Telegram");
    } finally {
      setTelegramBusy(false);
    }
  }

  useEffect(() => {
    loadAchievements();
    loadTelegramSettings();
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

      <section className="section-line clean-section profile-telegram-panel">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Telegram</p>
            <h2>Бот и напоминания</h2>
          </div>
          <span className={`profile-telegram-status ${telegram?.linked ? "is-linked" : ""}`}>
            {telegram?.linked ? "привязан" : "не привязан"}
          </span>
        </div>

        <ErrorLine error={telegramError} />

        {!telegram?.linked ? (
          <div className="profile-telegram-connect">
            <Button onClick={createTelegramLink} disabled={telegramBusy}>
              {telegramBusy ? "Создаем..." : "Подключить Telegram"}
            </Button>
            {telegramLink ? (
              <div className="profile-telegram-code">
                {telegramLink.deepLink ? (
                  <a className="btn btn-ghost" href={telegramLink.deepLink} target="_blank" rel="noreferrer">
                    Открыть Telegram
                  </a>
                ) : null}
                <span>Код: <strong>{telegramLink.linkCode}</strong></span>
                <small className="muted">Отправьте боту /start {telegramLink.linkCode}</small>
                <Button variant="thin" onClick={loadTelegramSettings} disabled={telegramBusy}>
                  Проверить статус
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="profile-telegram-settings">
            <label>
              <input
                type="checkbox"
                checked={telegram.remindersEnabled}
                disabled={telegramBusy}
                onChange={(event) => updateTelegramSettings({ ...telegram, remindersEnabled: event.target.checked })}
              />
              Напоминания включены
            </label>
            <label>
              <input
                type="checkbox"
                checked={telegram.plannedRemindersEnabled}
                disabled={telegramBusy || !telegram.remindersEnabled}
                onChange={(event) => updateTelegramSettings({ ...telegram, plannedRemindersEnabled: event.target.checked })}
              />
              Planned time
            </label>
            <label>
              <input
                type="checkbox"
                checked={telegram.deadlineRemindersEnabled}
                disabled={telegramBusy || !telegram.remindersEnabled}
                onChange={(event) => updateTelegramSettings({ ...telegram, deadlineRemindersEnabled: event.target.checked })}
              />
              Deadline
            </label>
            <Button variant="danger" onClick={unlinkTelegram} disabled={telegramBusy}>Отвязать Telegram</Button>
          </div>
        )}
      </section>
    </section>
  );
}
