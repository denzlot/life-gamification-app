import { useState } from "react";
import { api } from "../api/http";
import { Button } from "./Button";
import { characterCatalog, getCharacter, previewTheme, type CharacterId, saveSelectedCharacter } from "../utils/character";
import { useGame } from "../context/GameContext";
import { useToast } from "../context/ToastContext";

interface CharacterChooserProps {
  onConfirm?: (id: CharacterId) => void;
  onPreview?: (id: CharacterId) => void;
  title?: string;
  description?: string;
  initialCharacter?: CharacterId | null;
  embedded?: boolean;
}

export function CharacterChooser({
  onConfirm,
  onPreview,
  title = "Выбери персонажа",
  description = "Нажми на героя, чтобы сразу увидеть его тему. Подтверждение завершит выбор.",
  initialCharacter = null,
  embedded = false
}: CharacterChooserProps) {
  const { profile, refreshProfile } = useGame();
  const { notify } = useToast();
  const [selectedId, setSelectedId] = useState<CharacterId>((initialCharacter ?? profile?.gameStats.selectedCharacter ?? characterCatalog[0].id) as CharacterId);
  const unlocks = profile?.gameStats.unlocks ?? [];

  function isUnlocked(id: CharacterId) {
    if (!profile && (id === "lolbot" || id === "knight")) return true;
    return unlocks.some((unlock) => unlock.type === "CHARACTER" && unlock.targetKey === id && unlock.unlocked);
  }

  function requirement(id: CharacterId) {
    const unlock = unlocks.find((entry) => entry.type === "CHARACTER" && entry.targetKey === id);
    return unlock && !unlock.unlocked ? `Откроется на ${unlock.requiredLevel} уровне` : null;
  }

  function chooseCharacter(id: CharacterId) {
    if (!isUnlocked(id)) return;
    setSelectedId(id);
    onPreview?.(id);
    previewTheme(getCharacter(id).theme);
  }

  async function confirmSelection() {
    const character = getCharacter(selectedId);
    try {
      await api.profile.updatePreferences({ character: selectedId, theme: character.theme });
      saveSelectedCharacter(selectedId);
      await refreshProfile();
      onConfirm?.(selectedId);
    } catch (err) {
      notify({ tone: "danger", title: "Персонаж закрыт", text: err instanceof Error ? err.message : "Пока нельзя выбрать этого персонажа." });
    }
  }

  return (
    <section className={`character-chooser ${embedded ? "embedded" : "modal"}`}>
      <div className="character-chooser-head">
        <div>
          <p className="eyebrow">персонаж</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>

      <div className="character-card-grid character-grid">
        {characterCatalog.map((character) => (
          <button
            type="button"
            key={character.id}
            className={`character-card character-theme-${character.theme} ${selectedId === character.id ? "active" : ""} ${isUnlocked(character.id) ? "" : "locked"}`}
            disabled={!isUnlocked(character.id)}
            onClick={() => chooseCharacter(character.id)}
          >
            <div className="character-card-preview">
              {character.preview ? <img src={character.preview} alt={character.name} /> : null}
            </div>
            <div className="character-card-body">
              <strong>{character.name}</strong>
              <span>{character.title}</span>
              <small>{requirement(character.id) ?? character.description}</small>
            </div>
          </button>
        ))}
      </div>

      <div className="character-chooser-actions">
        <Button onClick={confirmSelection}>Подтвердить персонажа</Button>
      </div>
    </section>
  );
}
